'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateConversationId } from '@/lib/conversations';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Store, Loader2, Send, X, Info, MessageSquare } from 'lucide-react';
import type { Showroom, ShowroomCommissionOption } from '@/lib/supabase';
import { ContactShowroomButton } from '@/components/messaging/ContactShowroomButton';
import { getCandidatureWindowStatus, getCandidatureDaysLeft, formatCandidaturePeriodLabel } from '@/app/admin/components/ShowroomFichePreview';

function rentPeriodLabel(period: string | null): string {
  if (period === 'week') return '/sem.';
  if (period === 'one_off') return ' unique';
  return '/mois';
}

function optionSummary(opt: ShowroomCommissionOption): string {
  const parts: string[] = [];
  if (opt.rent != null && opt.rent > 0) {
    parts.push(`${opt.rent}€${rentPeriodLabel(opt.rent_period)}`);
  }
  if (opt.commission_percent != null) {
    parts.push(`${opt.commission_percent} % sur ventes`);
  }
  if (opt.description?.trim()) parts.push(opt.description);
  return parts.join(' · ') || 'Option';
}

function formatShowroomDates(start: string | null, end: string | null): string {
  try {
    const d1 = start ? new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const d2 = end ? new Date(end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    if (d1 && d2) return `du ${d1} au ${d2}`;
    if (d1) return `à partir du ${d1}`;
    if (d2) return `jusqu'au ${d2}`;
    return '';
  } catch {
    return '';
  }
}

export default function DiscoverPage() {
  const router = useRouter();
  const { entityType, activeBrand, userId } = useAdminEntity();
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalShowroom, setModalShowroom] = useState<Showroom | null>(null);
  const [modalCommissionOptions, setModalCommissionOptions] = useState<ShowroomCommissionOption[] | null>(null);
  const [optionsByShowroomId, setOptionsByShowroomId] = useState<Record<number, ShowroomCommissionOption[]>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isNegotiation, setIsNegotiation] = useState(false);
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [motivationMessage, setMotivationMessage] = useState('');
  const [partnershipStartDate, setPartnershipStartDate] = useState('');
  const [partnershipEndDate, setPartnershipEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: showroomsData } = await supabase.from('showrooms').select('*').eq('publication_status', 'published').order('name');
      const list = (showroomsData as Showroom[]) ?? [];
      setShowrooms(list);
      if (list.length > 0) {
        const ids = list.map((s) => s.id);
        const { data: optsData } = await supabase
          .from('showroom_commission_options')
          .select('*')
          .in('showroom_id', ids)
          .order('sort_order');
        const opts = (optsData as ShowroomCommissionOption[]) ?? [];
        const byId: Record<number, ShowroomCommissionOption[]> = {};
        for (const o of opts) {
          if (!byId[o.showroom_id]) byId[o.showroom_id] = [];
          byId[o.showroom_id].push(o);
        }
        setOptionsByShowroomId(byId);
      }
      setLoading(false);
    })();
  }, []);

  async function openModal(showroom: Showroom) {
    setModalShowroom(showroom);
    setModalCommissionOptions(null);
    setSelectedOptionId(null);
    setIsNegotiation(false);
    setNegotiationMessage('');
    setMotivationMessage('');
    setPartnershipStartDate('');
    setPartnershipEndDate('');
    const { data } = await supabase
      .from('showroom_commission_options')
      .select('*')
      .eq('showroom_id', showroom.id)
      .order('sort_order');
    setModalCommissionOptions((data as ShowroomCommissionOption[]) ?? []);
  }

  async function submitCandidature() {
    if (!activeBrand || !modalShowroom || !userId) return;
    const hasOption = selectedOptionId != null && !isNegotiation;
    const hasNegotiation = isNegotiation && negotiationMessage.trim().length > 0;
    if (!hasOption && !hasNegotiation) return;
    if (!partnershipStartDate.trim() || !partnershipEndDate.trim()) return;
    setSubmitting(true);
    try {
      const conversationId = await getOrCreateConversationId(activeBrand.id, modalShowroom.id);
      if (!conversationId) {
        setSubmitting(false);
        return;
      }

      const startAt = new Date(partnershipStartDate);
      startAt.setHours(0, 0, 0, 0);
      const endAt = new Date(partnershipEndDate);
      endAt.setHours(23, 59, 59, 999);
      const expiresAt = endAt.toISOString();
      const metadata: Record<string, unknown> = {
        status: 'pending',
        partnership_start_at: startAt.toISOString(),
        partnership_end_at: endAt.toISOString(),
        expires_at: expiresAt,
      };
      if (hasOption && modalCommissionOptions) {
        const opt = modalCommissionOptions.find((o) => o.id === selectedOptionId);
        if (opt) {
          metadata.rent = opt.rent ?? undefined;
          metadata.rent_period = opt.rent_period ?? 'month';
          metadata.commission_percent = opt.commission_percent ?? undefined;
          if (opt.description?.trim()) metadata.option_description = opt.description;
        }
      } else if (hasNegotiation) {
        metadata.negotiation_message = negotiationMessage.trim();
      }
      // CANDIDATURE_SENT + optional CHAT below
      void (null as unknown as string);
      /**/
      if (false)
        (hasNegotiation ? `Demande de candidature avec proposition : ${negotiationMessage.trim().slice(0, 200)}${negotiationMessage.trim().length > 200 ? '…' : ''}` : 'J’ai envoyé une demande de candidature pour exposer mes produits dans votre boutique.');
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        type: 'CANDIDATURE_SENT',
        sender_id: userId,
        sender_role: 'brand',
        content: motivationMessage.trim() || null,
        metadata,
        is_read: false,
      });

      if (motivationMessage.trim()) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          type: 'CHAT',
          sender_id: userId,
          sender_role: 'brand',
          content: motivationMessage.trim(),
          is_read: false,
        });
      }

      setModalShowroom(null);
      setModalCommissionOptions(null);
      router.push(`/messages?conversationId=${conversationId}`);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    (selectedOptionId != null && !isNegotiation) || (isNegotiation && negotiationMessage.trim().length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (entityType !== 'brand' || !activeBrand) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <p className="text-neutral-600">Sélectionnez une marque pour vendre vos produits.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Propulsez votre marque dans les meilleurs lieux de vente</h1>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showrooms.map((s) => (
          <article key={s.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="aspect-[4/3] bg-neutral-100 flex items-center justify-center">
              {s.image_url?.trim() ? <img src={s.image_url.trim()} alt="" className="w-full h-full object-cover" /> : <Store className="h-12 w-12 text-neutral-300" />}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                {s.avatar_url?.trim() && (
                  <div className="w-12 h-12 rounded-full bg-neutral-100 shrink-0 overflow-hidden border border-neutral-200">
                    <img src={s.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-neutral-900">{s.name}</h3>
                  {s.city && <p className="text-sm text-neutral-500 mt-0.5">{s.city}</p>}
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {s.is_permanent !== false
                      ? 'Lieu permanent'
                      : (s.start_date || s.end_date)
                        ? `Éphémère · ${formatShowroomDates(s.start_date, s.end_date)}`
                        : 'Éphémère'}
                  </p>
                </div>
              </div>
              {s.description && <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{s.description}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {(optionsByShowroomId[s.id]?.length ?? 0) > 0 ? (
                  optionsByShowroomId[s.id].slice(0, 3).map((o) => (
                    <span key={o.id} className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-900 shadow-sm">
                      {o.rent != null && (
                        <span>{o.rent}€{rentPeriodLabel(o.rent_period)}</span>
                      )}
                      {o.commission_percent != null && (
                        <span>{o.commission_percent} %</span>
                      )}
                      {(o.description?.trim() ?? '') && (
                        <span
                          className="text-neutral-400 hover:text-neutral-600 cursor-help"
                          title={o.description ?? undefined}
                          aria-label="Voir les conditions"
                        >
                          <Info className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                  ))
                ) : null}
              </div>
              {formatCandidaturePeriodLabel(s.candidature_open_from ?? undefined, s.candidature_open_to ?? undefined) && (
                <p className="mt-2 text-xs text-neutral-500">
                  {formatCandidaturePeriodLabel(s.candidature_open_from ?? undefined, s.candidature_open_to ?? undefined)}
                </p>
              )}
              {getCandidatureWindowStatus(s.candidature_open_from, s.candidature_open_to) === 'open' && (() => {
                const daysLeft = getCandidatureDaysLeft(s.candidature_open_to);
                return daysLeft != null && daysLeft <= 7 && daysLeft >= 0 ? (
                  <p className="mt-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                    {daysLeft === 0 ? 'Dernier jour pour candidater' : daysLeft === 1 ? 'Plus qu’un jour avant la fin des candidatures' : `Plus que ${daysLeft} jours avant la fin des candidatures`}
                  </p>
                ) : null;
              })()}
              <div className="mt-4 flex flex-col gap-2">
                {getCandidatureWindowStatus(s.candidature_open_from, s.candidature_open_to) === 'open' ? (
                  <button
                    type="button"
                    onClick={() => openModal(s)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
                  >
                    <Send className="h-4 w-4" />
                    Candidater
                  </button>
                ) : (
                  <div
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium ${
                      getCandidatureWindowStatus(s.candidature_open_from, s.candidature_open_to) === 'upcoming'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-neutral-200 text-neutral-500'
                    }`}
                  >
                    {getCandidatureWindowStatus(s.candidature_open_from, s.candidature_open_to) === 'upcoming' ? 'À venir' : 'Terminé'}
                  </div>
                )}
                <ContactShowroomButton
                  showroomId={s.id}
                  brandId={activeBrand.id}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50"
                >
                  Contacter la boutique
                </ContactShowroomButton>
              </div>
            </div>
          </article>
        ))}
      </div>

      {showrooms.length === 0 && !loading && (
        <p className="mt-6 text-center text-neutral-500">Aucune boutique publiée pour le moment.</p>
      )}

      {modalShowroom && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setModalShowroom(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col" role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-3">
                <h2 id="modal-title" className="text-lg font-semibold text-neutral-900 truncate">Candidater · {modalShowroom.name}</h2>
                <div className="flex items-center gap-2 shrink-0">
                  <ContactShowroomButton
                    showroomId={modalShowroom.id}
                    brandId={activeBrand.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contacter
                  </ContactShowroomButton>
                  <button type="button" onClick={() => setModalShowroom(null)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" aria-label="Fermer">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm text-neutral-600">Choisissez l’option de rémunération qui vous convient, ou proposez un autre tarif.</p>

                {modalCommissionOptions != null && modalCommissionOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-neutral-700">Options proposées par la boutique</p>
                    <ul className="space-y-2">
                      {modalCommissionOptions.map((opt, i) => (
                        <li key={opt.id ?? i}>
                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${selectedOptionId === opt.id && !isNegotiation ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50/50'}`}>
                            <input
                              type="radio"
                              name="option"
                              checked={selectedOptionId === opt.id && !isNegotiation}
                              onChange={() => { setSelectedOptionId(opt.id); setIsNegotiation(false); }}
                              className="mt-1 rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                            />
                            <span className="text-sm text-neutral-900">{optionSummary(opt)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${isNegotiation ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50/50'}`}>
                    <input
                      type="radio"
                      name="option"
                      checked={isNegotiation}
                      onChange={() => { setIsNegotiation(true); setSelectedOptionId(null); }}
                      className="mt-1 rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span className="text-sm font-medium text-neutral-900">Tenter une négociation sur un tarif différent</span>
                  </label>
                  {isNegotiation && (
                    <textarea
                      value={negotiationMessage}
                      onChange={(e) => setNegotiationMessage(e.target.value)}
                      placeholder="Décrivez votre proposition (loyer, commission, conditions…)"
                      rows={3}
                      className="w-full ml-6 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                    />
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-neutral-900 mb-2">Période du partenariat</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-neutral-600 block mb-1">Date de début</span>
                      <input
                        type="date"
                        value={partnershipStartDate}
                        onChange={(e) => setPartnershipStartDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 10)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-neutral-600 block mb-1">Date de fin</span>
                      <input
                        type="date"
                        value={partnershipEndDate}
                        onChange={(e) => setPartnershipEndDate(e.target.value)}
                        min={partnershipStartDate || new Date().toISOString().slice(0, 10)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">L’offre pourra être acceptée jusqu’à la date de fin du partenariat.</p>
                </div>

                <div>
                  <label htmlFor="motivation" className="block text-sm font-medium text-neutral-900 mb-1">Message (optionnel)</label>
                  <textarea
                    id="motivation"
                    value={motivationMessage}
                    onChange={(e) => setMotivationMessage(e.target.value)}
                    placeholder="Présentez votre marque en quelques mots…"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-neutral-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setModalShowroom(null)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!canSubmit || submitting}
                  onClick={submitCandidature}
                  className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Envoyer la candidature
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
