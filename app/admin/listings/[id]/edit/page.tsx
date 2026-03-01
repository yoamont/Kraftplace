'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAdminEntity } from '../../../context/AdminEntityContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Loader2, Store, PenLine } from 'lucide-react';
import type { Listing } from '@/lib/supabase';

function getDurationLabel(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  try {
    const d1 = new Date(start);
    const d2 = new Date(end);
    if (d2 < d1) return '';
    const days = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) return '';
    if (days === 1) return '1 jour';
    if (days < 8) return `${days} jours`;
    if (days <= 21) return `${Math.round(days / 7)} semaine${Math.round(days / 7) > 1 ? 's' : ''}`;
    if (days <= 45) return '1 mois';
    if (days <= 365) return `${Math.round(days / 30)} mois`;
    return `${Math.round(days / 365)} an${Math.round(days / 365) > 1 ? 's' : ''}`;
  } catch {
    return '';
  }
}

function formatExistenceRange(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  try {
    const d1 = start ? new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const d2 = end ? new Date(end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    if (d1 && d2) return `${d1} au ${d2}`;
    return d1 || d2 || '';
  } catch {
    return start || end || '';
  }
}

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = Number(params.id);
  const { entityType, activeShowroom } = useAdminEntity();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [partnershipStart, setPartnershipStart] = useState('');
  const [partnershipEnd, setPartnershipEnd] = useState('');
  const [applicationOpen, setApplicationOpen] = useState('');
  const [applicationClose, setApplicationClose] = useState('');
  const [status, setStatus] = useState<Listing['status']>('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEphemeral = activeShowroom?.shop_type === 'ephemeral';
  const existenceStart = activeShowroom?.start_date ?? null;
  const existenceEnd = activeShowroom?.end_date ?? null;

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom || !listingId || Number.isNaN(listingId)) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error: err } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .eq('showroom_id', activeShowroom.id)
        .single();
      if (err || !data) {
        router.replace('/admin/listings');
        return;
      }
      const row = data as Listing;
      setTitle(row.title ?? '');
      setPartnershipStart(row.partnership_start_date ?? '');
      setPartnershipEnd(row.partnership_end_date ?? '');
      setApplicationOpen(row.application_open_date ?? '');
      setApplicationClose(row.application_close_date ?? '');
      setStatus(row.status ?? 'draft');
    })().finally(() => setLoading(false));
  }, [entityType, activeShowroom?.id, listingId, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeShowroom || entityType !== 'showroom') return;
    if (!title.trim()) {
      setError('Le titre est requis.');
      return;
    }
    if (!partnershipStart || !partnershipEnd) {
      setError('Les dates de partenariat sont obligatoires.');
      return;
    }
    if (new Date(partnershipEnd) < new Date(partnershipStart)) {
      setError('La date de fin du partenariat doit être postérieure à la date de début.');
      return;
    }
    if (applicationOpen && applicationClose && partnershipStart) {
      const closeDate = new Date(applicationClose);
      const partnerStart = new Date(partnershipStart);
      if (closeDate > partnerStart) {
        setError('La date de clôture des candidatures ne peut pas être postérieure au début du partenariat.');
        return;
      }
    }
    if (isEphemeral && existenceStart && existenceEnd) {
      const pStart = new Date(partnershipStart);
      const pEnd = new Date(partnershipEnd);
      const eStart = new Date(existenceStart);
      const eEnd = new Date(existenceEnd);
      if (pStart < eStart || pEnd > eEnd) {
        setError('En tant que lieu éphémère, le partenariat doit s\'inscrire dans vos dates d\'ouverture du lieu.');
        return;
      }
    }

    if (status === 'published') {
      const { data: existing } = await supabase
        .from('listings')
        .select('id, title')
        .eq('showroom_id', activeShowroom.id)
        .eq('status', 'published')
        .neq('id', listingId)
        .maybeSingle();
      if (existing && !window.confirm('Une annonce est déjà en ligne. Voulez-vous la remplacer par celle-ci ?')) {
        return;
      }
    }

    setError(null);
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('listings')
        .update({
          title: title.trim(),
          status,
          partnership_start_date: partnershipStart || null,
          partnership_end_date: partnershipEnd || null,
          application_open_date: applicationOpen || null,
          application_close_date: applicationClose || null,
        })
        .eq('id', listingId)
        .eq('showroom_id', activeShowroom.id);
      if (err) {
        setError(err.message);
        return;
      }
      router.push('/admin/listings');
    } finally {
      setSaving(false);
    }
  }

  if (entityType === 'brand') {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <p className="text-neutral-600">Cette page est réservée aux boutiques.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <Link href="/admin/listings" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Retour aux annonces
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900">Modifier l’annonce</h1>

      {isEphemeral && existenceStart && existenceEnd && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-sm text-amber-900">
          Ces dates doivent être comprises dans vos dates d&apos;ouverture globale : <strong>{formatExistenceRange(existenceStart, existenceEnd)}</strong>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Titre de l’annonce <span className="text-red-600">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 bg-[#faf8f5] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 focus:border-neutral-300"
            required
          />
        </div>
        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-neutral-700">
            <PenLine className="h-4 w-4 text-neutral-500" aria-hidden />
            <h2 className="text-sm font-semibold">Quand les marques peuvent-elles postuler ?</h2>
          </div>
          <p className="text-xs text-neutral-500">Période pendant laquelle les marques peuvent candidater. Vide = toujours ouvert.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Du</label>
              <input type="date" value={applicationOpen} onChange={(e) => setApplicationOpen(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Au</label>
              <input type="date" value={applicationClose} onChange={(e) => setApplicationClose(e.target.value)} min={applicationOpen || undefined} max={partnershipStart || undefined} className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20" />
            </div>
          </div>
          {applicationOpen && applicationClose && <p className="text-xs text-neutral-500">Durée : {getDurationLabel(applicationOpen, applicationClose)}</p>}
        </div>

        <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-neutral-700">
            <Store className="h-4 w-4 text-neutral-500" aria-hidden />
            <h2 className="text-sm font-semibold">Dates de présence en boutique</h2>
            <span className="text-red-600">*</span>
          </div>
          <p className="text-xs text-neutral-500">Période pendant laquelle les marques seront exposées dans votre lieu.</p>
          {isEphemeral && existenceStart && existenceEnd && (
            <p className="text-xs text-amber-800 bg-amber-50/80 rounded-lg px-2.5 py-1.5">Ces dates doivent être comprises dans vos dates d&apos;ouverture globale.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Début</label>
              <input type="date" value={partnershipStart} onChange={(e) => setPartnershipStart(e.target.value)} min={isEphemeral && existenceStart ? existenceStart : undefined} max={isEphemeral && existenceEnd ? existenceEnd : undefined} required className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Fin</label>
              <input type="date" value={partnershipEnd} onChange={(e) => setPartnershipEnd(e.target.value)} min={partnershipStart || (isEphemeral && existenceStart ? existenceStart : undefined)} max={isEphemeral && existenceEnd ? existenceEnd : undefined} required className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20" />
            </div>
          </div>
          {partnershipStart && partnershipEnd && <p className="text-xs text-neutral-500">Durée : {getDurationLabel(partnershipStart, partnershipEnd)}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as Listing['status'])} className="w-full max-w-[200px] px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900">
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Link href="/admin/listings" className="py-2.5 px-4 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50">
            Annuler
          </Link>
          <button type="submit" disabled={saving} className="py-2.5 px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
