'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getOrCreateConversationId } from '@/lib/conversations';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Store, Loader2, Send, X, Info, Coins } from 'lucide-react';
import type { Showroom, ShowroomCommissionOption } from '@/lib/supabase';
import { getCandidatureWindowStatus, getCandidatureDaysLeft, formatCandidaturePeriodLabel } from '@/app/admin/components/ShowroomFichePreview';
import { CreditsRechargeModal } from '@/app/admin/components/CreditsRechargeModal';

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
  const { entityType, activeBrand, userId, refresh } = useAdminEntity();
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalShowroom, setModalShowroom] = useState<Showroom | null>(null);
  const [modalCommissionOptions, setModalCommissionOptions] = useState<ShowroomCommissionOption[] | null>(null);
  const [optionsByShowroomId, setOptionsByShowroomId] = useState<Record<number, ShowroomCommissionOption[]>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isNegotiation, setIsNegotiation] = useState(false);
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [motivationMessage, setMotivationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [confirmModalShowroom, setConfirmModalShowroom] = useState<Showroom | null>(null);
  const [showSlotsFullModal, setShowSlotsFullModal] = useState(false);
  type CandidatureInfo = { conversationId: string; status: 'pending' | 'accepted' | 'rejected' };
  const [candidatureByShowroomId, setCandidatureByShowroomId] = useState<Record<number, CandidatureInfo>>({});

  const credits = typeof activeBrand?.credits === 'number' ? activeBrand.credits : 0;
  const reserved = typeof (activeBrand as { reserved_credits?: number } | undefined)?.reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
  const available = credits - reserved;
  const slotsFull = credits > 0 && available < 1;
  const noCredits = credits === 0;

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

  useEffect(() => {
    if (!activeBrand?.id || entityType !== 'brand') {
      setCandidatureByShowroomId({});
      return;
    }
    (async () => {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, showroom_id')
        .eq('brand_id', activeBrand.id);
      const list = (convs as { id: string; showroom_id: number }[]) ?? [];
      if (list.length === 0) {
        setCandidatureByShowroomId({});
        return;
      }
      const convIds = list.map((c) => c.id);
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, conversation_id, type, created_at, metadata')
        .in('conversation_id', convIds)
        .in('type', ['CANDIDATURE_SENT', 'CANDIDATURE_ACCEPTED', 'CANDIDATURE_REFUSED'])
        .order('created_at', { ascending: true });
      const messages = (msgs as { id: string; conversation_id: string; type: string; created_at: string; metadata: Record<string, unknown> | null }[]) ?? [];
      const byConv = new Map<string, typeof messages>();
      for (const m of messages) {
        if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
        byConv.get(m.conversation_id)!.push(m);
      }
      const byShowroom: Record<number, CandidatureInfo> = {};
      for (const c of list) {
        const ms = byConv.get(c.id) ?? [];
        const sentIdx = ms.findIndex((m) => m.type === 'CANDIDATURE_SENT');
        if (sentIdx === -1) continue;
        const acceptedAfter = ms.slice(sentIdx + 1).some((m) => m.type === 'CANDIDATURE_ACCEPTED');
        const refusedAfter = ms.slice(sentIdx + 1).some((m) => m.type === 'CANDIDATURE_REFUSED');
        const lastSent = ms[sentIdx];
        const meta = (lastSent.metadata ?? {}) as { status?: string };
        if (acceptedAfter) {
          byShowroom[c.showroom_id] = { conversationId: c.id, status: 'accepted' };
        } else if (refusedAfter || meta.status === 'rejected' || meta.status === 'cancelled') {
          byShowroom[c.showroom_id] = { conversationId: c.id, status: 'rejected' };
        } else {
          byShowroom[c.showroom_id] = { conversationId: c.id, status: 'pending' };
        }
      }
      setCandidatureByShowroomId(byShowroom);
    })();
  }, [activeBrand?.id, entityType]);

  async function openModal(showroom: Showroom) {
    setModalShowroom(showroom);
    setModalCommissionOptions(null);
    setSelectedOptionId(null);
    setIsNegotiation(false);
    setNegotiationMessage('');
    setMotivationMessage('');
    const { data } = await supabase
      .from('showroom_commission_options')
      .select('*')
      .eq('showroom_id', showroom.id)
      .order('sort_order');
    setModalCommissionOptions((data as ShowroomCommissionOption[]) ?? []);
  }

  function handleCandidaterClick(showroom: Showroom) {
    if (!activeBrand) return;
    if (noCredits) {
      setShowRechargeModal(true);
      return;
    }
    if (slotsFull) {
      setShowSlotsFullModal(true);
      return;
    }
    setConfirmModalShowroom(showroom);
  }

  function handleConfirmCandidature() {
    if (!confirmModalShowroom) return;
    openModal(confirmModalShowroom);
    setConfirmModalShowroom(null);
  }

  async function submitCandidature() {
    if (!activeBrand || !modalShowroom || !userId) return;
    const hasOption = selectedOptionId != null && !isNegotiation;
    const hasNegotiation = isNegotiation && negotiationMessage.trim().length > 0;
    if (!hasOption && !hasNegotiation) return;
    setSubmitting(true);
    try {
      const conversationId = await getOrCreateConversationId(activeBrand.id, modalShowroom.id);
      if (!conversationId) {
        setSubmitting(false);
        return;
      }

      const metadata: Record<string, unknown> = {
        status: 'pending',
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

      const reserved = typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
      await supabase.from('brands').update({ reserved_credits: reserved + 1 }).eq('id', activeBrand.id);
      await refresh();

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
                  {s.is_permanent !== false && (s.start_date || s.end_date) && (
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Partenariat : {formatShowroomDates(s.start_date, s.end_date)}
                    </p>
                  )}
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
                {candidatureByShowroomId[s.id] ? (
                  (() => {
                    const cand = candidatureByShowroomId[s.id];
                    if (cand.status === 'pending') {
                      return (
                        <div
                          className="w-full flex flex-col items-center gap-1.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-800 text-sm"
                          title="Nous vous préviendrons dès que la boutique aura répondu."
                        >
                          <span className="font-medium">🕒 Candidature en attente</span>
                          <span className="text-xs text-amber-700/90">Nous vous préviendrons dès que la boutique aura répondu.</span>
                          <Link href={`/messages?conversationId=${cand.conversationId}`} className="text-xs font-medium text-amber-800 underline hover:no-underline">
                            Voir la conversation
                          </Link>
                        </div>
                      );
                    }
                    if (cand.status === 'accepted') {
                      return (
                        <div className="w-full flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm">
                          <span className="font-medium">Validée – Chat ouvert</span>
                          <Link href={`/messages?conversationId=${cand.conversationId}`} className="text-xs font-medium underline hover:no-underline">
                            Voir la conversation
                          </Link>
                        </div>
                      );
                    }
                    return (
                      <div className="w-full flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 text-sm">
                        <span className="font-medium">Refusée – Crédit libéré</span>
                        {getCandidatureWindowStatus(s.candidature_open_from, s.candidature_open_to) === 'open' && (
                          <button type="button" onClick={() => handleCandidaterClick(s)} className="text-xs font-medium text-neutral-900 underline hover:no-underline">
                            Candidater à nouveau
                          </button>
                        )}
                      </div>
                    );
                  })()
                ) : getCandidatureWindowStatus(s.candidature_open_from, s.candidature_open_to) === 'open' ? (
                  noCredits ? (
                    <button
                      type="button"
                      onClick={() => setShowRechargeModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-200 text-neutral-500 text-sm font-medium cursor-pointer hover:bg-neutral-300 transition-colors"
                    >
                      <Coins className="h-4 w-4" />
                      Plus de crédits
                    </button>
                  ) : slotsFull ? (
                    <button
                      type="button"
                      onClick={() => setShowSlotsFullModal(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-200 text-neutral-500 text-sm font-medium cursor-pointer hover:bg-neutral-300 transition-colors"
                    >
                      Slots pleins
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCandidaterClick(s)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
                    >
                      <Coins className="h-4 w-4" />
                      Candidater (1 crédit)
                    </button>
                  )
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
                <button type="button" onClick={() => setModalShowroom(null)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 shrink-0" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
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

      {showRechargeModal && (
        <CreditsRechargeModal
          onClose={() => setShowRechargeModal(false)}
          title="Recharger mes crédits"
          introMessage="Vous n'avez plus de crédits disponibles. Prenez un pack pour continuer à développer votre réseau."
        />
      )}

      {showSlotsFullModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setShowSlotsFullModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 pointer-events-auto space-y-4">
              <h3 className="text-lg font-semibold text-neutral-900">Slots de candidature complets</h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Vos slots de candidature sont pleins. Libérez-en un ou augmentez votre capacité pour continuer.
              </p>
              <div className="flex gap-3 pt-2">
                <Link
                  href="/messages"
                  className="flex-1 text-center py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50"
                >
                  Voir mes conversations
                </Link>
                <button
                  type="button"
                  onClick={() => { setShowSlotsFullModal(false); setShowRechargeModal(true); }}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
                >
                  Recharger des crédits
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowSlotsFullModal(false)}
                className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </>
      )}

      {confirmModalShowroom && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setConfirmModalShowroom(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 pointer-events-auto space-y-5">
              <h3 className="text-lg font-semibold text-neutral-900">
                Envoyer ma candidature à {confirmModalShowroom.name}
              </h3>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Cette action utilise 1 crédit. Votre crédit ne sera débité que si la boutique accepte votre demande et ouvre la messagerie. En attendant, ce crédit sera « réservé ».
              </p>
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 space-y-1">
                <p className="text-sm text-neutral-700">
                  Votre solde : <span className="font-semibold">{credits} ✨</span>
                </p>
                <p className="text-sm text-neutral-700">
                  Solde après validation : <span className="font-semibold">{credits - 1} ✨</span>
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmModalShowroom(null)}
                  className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCandidature}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
