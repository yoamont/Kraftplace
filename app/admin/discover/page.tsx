'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Loader2, Send, X, Coins } from 'lucide-react';
import type { Showroom, ShowroomCommissionOption, Listing, Badge } from '@/lib/supabase';
import { getCandidatureWindowStatus } from '@/app/admin/components/ShowroomFichePreview';
import { CreditsRechargeModal } from '@/app/admin/components/CreditsRechargeModal';
import { BoutiqueCard } from '@/app/admin/components/cards/BoutiqueCard';
import { CandidatureStatusBlock } from '@/app/admin/components/cards/CandidatureStatusBlock';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';

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

export type CommissionFilterType = 'all' | 'commission' | 'rent' | 'hybrid';

function getCommissionType(opts: ShowroomCommissionOption[]): CommissionFilterType {
  const hasCommission = opts.some((o) => o.commission_percent != null && o.commission_percent > 0);
  const hasRent = opts.some((o) => o.rent != null && o.rent > 0);
  if (hasCommission && hasRent) return 'hybrid';
  if (hasCommission) return 'commission';
  if (hasRent) return 'rent';
  return 'all';
}

function getDaysUntilClose(applicationCloseDate: string | null): number | null {
  if (!applicationCloseDate?.trim()) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const close = new Date(applicationCloseDate);
  close.setHours(0, 0, 0, 0);
  const diff = Math.ceil((close.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? null : diff;
}

function partnershipOverlapsMonth(
  partnershipStart: string | null,
  partnershipEnd: string | null,
  year: number,
  month: number
): boolean {
  if (!partnershipStart?.trim() || !partnershipEnd?.trim()) return true;
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const start = new Date(partnershipStart);
  const end = new Date(partnershipEnd);
  return start <= lastDay && end >= firstDay;
}

const MONTH_NAMES = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTH_SHORT = ['JAN.', 'FÉV.', 'MAR.', 'AVR.', 'MAI', 'JUN.', 'JUL.', 'AOÛ.', 'SEP.', 'OCT.', 'NOV.', 'DÉC.'];

function getNext6Months(): { year: number; month: number; shortLabel: string }[] {
  const out: { year: number; month: number; shortLabel: string }[] = [];
  const d = new Date();
  for (let i = 0; i < 6; i++) {
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    out.push({ year: y, month: m, shortLabel: MONTH_SHORT[m - 1] });
    d.setMonth(d.getMonth() + 1);
  }
  return out;
}

export default function DiscoverPage() {
  const router = useRouter();
  const { entityType, activeBrand, userId, refresh } = useAdminEntity();
  type DiscoverRow = { listing: Listing; showroom: Showroom };
  const [rows, setRows] = useState<DiscoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalRow, setModalRow] = useState<DiscoverRow | null>(null);
  const [modalCommissionOptions, setModalCommissionOptions] = useState<ShowroomCommissionOption[] | null>(null);
  const [optionsByShowroomId, setOptionsByShowroomId] = useState<Record<number, ShowroomCommissionOption[]>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isNegotiation, setIsNegotiation] = useState(false);
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [motivationMessage, setMotivationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [confirmModalRow, setConfirmModalRow] = useState<DiscoverRow | null>(null);
  const [showSlotsFullModal, setShowSlotsFullModal] = useState(false);
  type CandidatureInfo = { conversationId: string; status: 'pending' | 'accepted' | 'rejected' };
  const [candidatureByListingId, setCandidatureByListingId] = useState<Record<number, CandidatureInfo>>({});
  const [candidatureLoading, setCandidatureLoading] = useState(true);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [badgesByShowroomId, setBadgesByShowroomId] = useState<Record<number, Badge[]>>({});
  const [filterBadgeSlugs, setFilterBadgeSlugs] = useState<string[]>([]);
  const [filterCommissionType, setFilterCommissionType] = useState<CommissionFilterType>('all');
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [filterClosesInDays, setFilterClosesInDays] = useState<number | null>(null);
  const [filterMonths, setFilterMonths] = useState<{ year: number; month: number }[]>([]);
  const [brandBadgeSlugs, setBrandBadgeSlugs] = useState<string[]>([]);
  const [openCityPopover, setOpenCityPopover] = useState(false);
  const [openUrgencyPopover, setOpenUrgencyPopover] = useState(false);
  const cityPopoverRef = useRef<HTMLDivElement>(null);
  const urgencyPopoverRef = useRef<HTMLDivElement>(null);
  const next6Months = getNext6Months();

  const credits = typeof activeBrand?.credits === 'number' ? activeBrand.credits : 0;
  const reserved = typeof (activeBrand as { reserved_credits?: number } | undefined)?.reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
  const available = credits - reserved;
  const slotsFull = credits > 0 && available < 1;
  const noCredits = credits === 0;

  useEffect(() => {
    (async () => {
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      const listings = (listingsData as Listing[]) ?? [];
      if (listings.length === 0) {
        setRows([]);
        setOptionsByShowroomId({});
        setLoading(false);
        return;
      }
      const showroomIds = [...new Set(listings.map((l) => l.showroom_id))];
      const [{ data: showroomsData }, { data: badgesData }, { data: showroomBadgesData }] = await Promise.all([
        supabase.from('showrooms').select('*').in('id', showroomIds),
        supabase.from('badges').select('*').order('sort_order'),
        showroomIds.length > 0 ? supabase.from('showroom_badges').select('showroom_id, badge_id').in('showroom_id', showroomIds) : { data: [] },
      ]);
      const showroomsList = (showroomsData as Showroom[]) ?? [];
      const showroomMap = Object.fromEntries(showroomsList.map((s) => [s.id, s]));
      const badgesList = (badgesData as Badge[]) ?? [];
      setAllBadges(badgesList);
      const badgeMap = Object.fromEntries(badgesList.map((b) => [b.id, b]));
      const sbList = (showroomBadgesData as { showroom_id: number; badge_id: number }[]) ?? [];
      const badgesByShowroom: Record<number, Badge[]> = {};
      for (const sb of sbList) {
        const badge = badgeMap[sb.badge_id];
        if (badge) {
          if (!badgesByShowroom[sb.showroom_id]) badgesByShowroom[sb.showroom_id] = [];
          badgesByShowroom[sb.showroom_id].push(badge);
        }
      }
      setBadgesByShowroomId(badgesByShowroom);
      const optsRes = await supabase
        .from('showroom_commission_options')
        .select('*')
        .in('showroom_id', showroomIds)
        .order('sort_order');
      const opts = (optsRes.data as ShowroomCommissionOption[]) ?? [];
      const byId: Record<number, ShowroomCommissionOption[]> = {};
      for (const o of opts) {
        if (!byId[o.showroom_id]) byId[o.showroom_id] = [];
        byId[o.showroom_id].push(o);
      }
      setOptionsByShowroomId(byId);
      const discoverRows: DiscoverRow[] = listings
        .map((listing) => ({ listing, showroom: showroomMap[listing.showroom_id] }))
        .filter((r): r is DiscoverRow => r.showroom != null);
      setRows(discoverRows);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand?.id) return;
    (async () => {
      const { data } = await supabase.from('brand_badges').select('badge_id').eq('brand_id', activeBrand.id);
      const ids = ((data as { badge_id: number }[]) ?? []).map((r) => r.badge_id);
      if (ids.length === 0) {
        setBrandBadgeSlugs([]);
        return;
      }
      const { data: badgesData } = await supabase.from('badges').select('slug').in('id', ids);
      const slugs = ((badgesData as { slug: string }[]) ?? []).map((b) => b.slug);
      setBrandBadgeSlugs(slugs);
    })();
  }, [entityType, activeBrand?.id]);

  useEffect(() => {
    if (!activeBrand?.id || entityType !== 'brand' || rows.length === 0) {
      setCandidatureByListingId({});
      setCandidatureLoading(false);
      return;
    }
    setCandidatureLoading(true);
    const listingIds = rows.map((r) => r.listing.id);
    (async () => {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, listing_id')
        .eq('brand_id', activeBrand.id)
        .in('listing_id', listingIds);
      const list = (convs as { id: string; listing_id: number | null }[]) ?? [];
      const withListing = list.filter((c) => c.listing_id != null);
      if (withListing.length === 0) {
        setCandidatureByListingId({});
        setCandidatureLoading(false);
        return;
      }
      const convIds = withListing.map((c) => c.id);
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
      const byListing: Record<number, CandidatureInfo> = {};
      for (const c of withListing) {
        if (c.listing_id == null) continue;
        const ms = byConv.get(c.id) ?? [];
        const sentIdx = ms.findIndex((m) => m.type === 'CANDIDATURE_SENT');
        if (sentIdx === -1) continue;
        const acceptedAfter = ms.slice(sentIdx + 1).some((m) => m.type === 'CANDIDATURE_ACCEPTED');
        const refusedAfter = ms.slice(sentIdx + 1).some((m) => m.type === 'CANDIDATURE_REFUSED');
        const lastSent = ms[sentIdx];
        const meta = (lastSent.metadata ?? {}) as { status?: string };
        if (acceptedAfter) {
          byListing[c.listing_id] = { conversationId: c.id, status: 'accepted' };
        } else if (refusedAfter || meta.status === 'rejected' || meta.status === 'cancelled') {
          byListing[c.listing_id] = { conversationId: c.id, status: 'rejected' };
        } else {
          byListing[c.listing_id] = { conversationId: c.id, status: 'pending' };
        }
      }
      setCandidatureByListingId(byListing);
      setCandidatureLoading(false);
    })();
  }, [activeBrand?.id, entityType, rows]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cityPopoverRef.current && !cityPopoverRef.current.contains(e.target as Node)) setOpenCityPopover(false);
      if (urgencyPopoverRef.current && !urgencyPopoverRef.current.contains(e.target as Node)) setOpenUrgencyPopover(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function openModal(row: DiscoverRow) {
    setModalRow(row);
    setModalCommissionOptions(null);
    setSelectedOptionId(null);
    setIsNegotiation(false);
    setNegotiationMessage('');
    setMotivationMessage('');
    const { data } = await supabase
      .from('showroom_commission_options')
      .select('*')
      .eq('showroom_id', row.showroom.id)
      .order('sort_order');
    setModalCommissionOptions((data as ShowroomCommissionOption[]) ?? []);
  }

  function handleCandidaterClick(row: DiscoverRow) {
    if (!activeBrand) return;
    if (noCredits) {
      setShowRechargeModal(true);
      return;
    }
    if (slotsFull) {
      setShowSlotsFullModal(true);
      return;
    }
    setConfirmModalRow(row);
  }

  function handleConfirmCandidature() {
    if (!confirmModalRow) return;
    openModal(confirmModalRow);
    setConfirmModalRow(null);
  }

  function getListingWindowStatus(listing: Listing) {
    return getCandidatureWindowStatus(listing.application_open_date, listing.application_close_date);
  }

  async function submitCandidature() {
    if (!activeBrand || !modalRow || !userId) return;
    const hasOption = selectedOptionId != null && !isNegotiation;
    const hasNegotiation = isNegotiation && negotiationMessage.trim().length > 0;
    if (!hasOption && !hasNegotiation) return;
    setSubmitting(true);
    try {
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
      // removed dead code
      if (false)
        (hasNegotiation ? `Demande de candidature avec proposition : ${negotiationMessage.trim().slice(0, 200)}${negotiationMessage.trim().length > 200 ? '…' : ''}` : "J'ai envoyé une demande de candidature pour exposer mes produits dans votre boutique.");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        alert('Session expirée. Reconnectez-vous.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/candidatures/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          brandId: activeBrand.id,
          showroomId: modalRow.showroom.id,
          listingId: modalRow.listing.id,
          metadata,
          motivationMessage: motivationMessage.trim() || '',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && data?.error) {
          alert(data.error);
        } else {
          alert(data?.error ?? "Erreur lors de l'envoi de la candidature.");
        }
        setSubmitting(false);
        return;
      }

      const conversationId = data.conversationId as string | undefined;
      if (conversationId) {
        await refresh();
        setModalRow(null);
        setModalCommissionOptions(null);
        setConfirmModalRow(null);
        router.push(`/messages?conversationId=${conversationId}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    (selectedOptionId != null && !isNegotiation) || (isNegotiation && negotiationMessage.trim().length > 0);

  const cities = [...new Set(rows.map((r) => r.showroom.city).filter((c): c is string => Boolean(c?.trim())))].sort((a, b) => a.localeCompare(b));

  const filteredRowsBase = rows.filter((row) => {
    if (filterBadgeSlugs.length > 0) {
      const rowBadges = badgesByShowroomId[row.showroom.id] ?? [];
      if (!rowBadges.some((b) => filterBadgeSlugs.includes(b.slug))) return false;
    }
    if (filterCommissionType !== 'all') {
      const opts = optionsByShowroomId[row.showroom.id] ?? [];
      const type = getCommissionType(opts);
      if (type !== filterCommissionType && type !== 'all') return false;
    }
    if (filterCity != null && filterCity !== '') {
      if ((row.showroom.city ?? '').trim() !== filterCity) return false;
    }
    if (filterClosesInDays != null) {
      const days = getDaysUntilClose(row.listing.application_close_date);
      if (days == null || days > filterClosesInDays) return false;
    }
    if (filterMonths.length > 0) {
      const overlapsAny = filterMonths.some((fm) =>
        partnershipOverlapsMonth(row.listing.partnership_start_date, row.listing.partnership_end_date, fm.year, fm.month)
      );
      if (!overlapsAny) return false;
    }
    return true;
  });

  const filteredRows = [...filteredRowsBase].sort((a, b) => {
    const countA = (badgesByShowroomId[a.showroom.id] ?? []).filter((b) => brandBadgeSlugs.includes(b.slug)).length;
    const countB = (badgesByShowroomId[b.showroom.id] ?? []).filter((b) => brandBadgeSlugs.includes(b.slug)).length;
    return countB - countA;
  });

  const hasActiveFilters =
    filterBadgeSlugs.length > 0 ||
    filterCommissionType !== 'all' ||
    filterCity != null ||
    filterClosesInDays != null ||
    filterMonths.length > 0;

  function clearAllFilters() {
    setFilterBadgeSlugs([]);
    setFilterCommissionType('all');
    setFilterCity(null);
    setFilterClosesInDays(null);
    setFilterMonths([]);
  }

  function toggleFilterMonth(year: number, month: number) {
    setFilterMonths((prev) => {
      const exists = prev.some((fm) => fm.year === year && fm.month === month);
      if (exists) return prev.filter((fm) => !(fm.year === year && fm.month === month));
      return [...prev, { year, month }];
    });
  }

  function toggleFilterBadge(slug: string) {
    setFilterBadgeSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

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
    <div className="min-h-[60vh] bg-[#faf8f5]">
      <h1 className="text-xl font-light text-neutral-900 tracking-tight">Vendre mes produits</h1>
      <p className="mt-0.5 text-sm text-neutral-500 font-light">Les boutiques qui partagent vos valeurs apparaissent en premier.</p>

      <div className="sticky top-0 z-10 mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 py-4 transition-[backdrop-filter] duration-200 supports-[backdrop-filter]:bg-[#faf8f5]/80 supports-[backdrop-filter]:backdrop-blur-md">
        {cities.length > 0 && (
          <>
            <div className="relative shrink-0" ref={cityPopoverRef}>
              <button
                type="button"
                onClick={() => { setOpenCityPopover((v) => !v); setOpenUrgencyPopover(false); }}
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors duration-150"
              >
                {filterCity ?? 'Toutes les villes'}
              </button>
              {openCityPopover && (
                <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[8rem] rounded-lg bg-white/95 py-1.5 shadow-lg ring-1 ring-neutral-200/60 backdrop-blur-sm transition-opacity duration-150 opacity-100">
                  <button type="button" onClick={() => { setFilterCity(null); setOpenCityPopover(false); }} className="w-full px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100/80 transition-colors">
                    Toutes les villes
                  </button>
                  {cities.map((city) => (
                    <button key={city} type="button" onClick={() => { setFilterCity(city); setOpenCityPopover(false); }} className="w-full px-3 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100/80 transition-colors">
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="h-3 w-[0.5px] shrink-0 bg-neutral-300/70" aria-hidden />
          </>
        )}
        <div className="flex items-center gap-x-1 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMonths([])}
            className={`relative px-1 py-0.5 pb-1 text-[11px] transition-colors duration-150 ${filterMonths.length === 0 ? 'font-bold text-neutral-900' : 'font-medium text-neutral-500 hover:text-neutral-700'}`}
          >
            Tous
            {filterMonths.length === 0 && <span className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-0.5 h-0.5 rounded-full bg-neutral-900" aria-hidden />}
          </button>
          <span className="text-neutral-400 font-light">·</span>
          {next6Months.map(({ year, month, shortLabel }) => {
            const selected = filterMonths.some((fm) => fm.year === year && fm.month === month);
            return (
              <button
                key={`${year}-${month}`}
                type="button"
                onClick={() => toggleFilterMonth(year, month)}
                className={`relative px-1 py-0.5 pb-1 text-[11px] transition-colors duration-150 ${selected ? 'font-bold text-neutral-900' : 'font-medium text-neutral-500 hover:text-neutral-700'}`}
              >
                {shortLabel}
                {selected && <span className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-0.5 h-0.5 rounded-full bg-neutral-900" aria-hidden />}
              </button>
            );
          }).reduce<React.ReactNode[]>((acc, el, i) => (i === 0 ? [el] : [...acc, <span key={`s-${i}`} className="text-neutral-400 font-light">·</span>, el]), [])}
        </div>
        <span className="h-3 w-[0.5px] shrink-0 bg-neutral-300/70" aria-hidden />
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {allBadges.map((badge) => {
            const selected = filterBadgeSlugs.includes(badge.slug);
            return (
              <button
                key={badge.id}
                type="button"
                onClick={() => toggleFilterBadge(badge.slug)}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 ${selected ? 'bg-neutral-900 text-white ring-1 ring-neutral-900' : 'bg-transparent text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'}`}
                title={badge.label}
              >
                <BadgeIcon badge={badge} className="w-4 h-4" />
              </button>
            );
          })}
        </div>
        <span className="h-3 w-[0.5px] shrink-0 bg-neutral-300/70" aria-hidden />
        <div className="inline-flex rounded-md p-0.5 bg-neutral-200/50 shrink-0">
          {(['all', 'commission', 'rent', 'hybrid'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterCommissionType(value)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all duration-150 ${filterCommissionType === value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              {value === 'all' ? 'Tous' : value === 'commission' ? 'Commission' : value === 'rent' ? 'Loyer' : 'Hybride'}
            </button>
          ))}
        </div>
        <span className="h-3 w-[0.5px] shrink-0 bg-neutral-300/70" aria-hidden />
        <div className="relative shrink-0" ref={urgencyPopoverRef}>
          <button
            type="button"
            onClick={() => { setOpenUrgencyPopover((v) => !v); setOpenCityPopover(false); }}
            className={`flex items-center justify-center w-8 h-8 rounded-full text-base transition-all duration-150 ${filterClosesInDays != null ? 'bg-amber-100 text-amber-800' : 'text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-700'}`}
            title="Ferme dans"
            aria-label="Filtrer par urgence de clôture"
          >
            ⏳
          </button>
          {openUrgencyPopover && (
            <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[10rem] rounded-lg bg-white/95 py-2 px-2 shadow-lg ring-1 ring-neutral-200/60 backdrop-blur-sm transition-opacity duration-150 opacity-100">
              <p className="text-[11px] font-medium text-neutral-500 px-2 pb-1.5">Ferme dans</p>
              {[null, 7, 15, 30].map((days) => (
                <button
                  key={days ?? 'all'}
                  type="button"
                  onClick={() => { setFilterClosesInDays(days); setOpenUrgencyPopover(false); }}
                  className={`w-full px-3 py-1.5 text-left text-sm font-medium rounded-md transition-colors ${filterClosesInDays === days ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100/80'}`}
                >
                  {days == null ? 'Tous' : `${days} jours`}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasActiveFilters && (
          <>
            <span className="h-3 w-[0.5px] shrink-0 bg-neutral-300/70" aria-hidden />
            <button type="button" onClick={clearAllFilters} className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors duration-150">
              Réinitialiser
            </button>
          </>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRows.map((row) => {
          const rowBadges = badgesByShowroomId[row.showroom.id] ?? [];
          const matchingSlugs = rowBadges.filter((b) => brandBadgeSlugs.includes(b.slug)).map((b) => b.slug);
          const urgencyDays = getDaysUntilClose(row.listing.application_close_date);
          return (
          <BoutiqueCard
            key={row.listing.id}
            showroom={row.showroom}
            commissionOptions={optionsByShowroomId[row.showroom.id] ?? []}
            listingTitle={row.listing.title}
            listingDates={{
              partnership_start_date: row.listing.partnership_start_date,
              partnership_end_date: row.listing.partnership_end_date,
              application_open_date: row.listing.application_open_date,
              application_close_date: row.listing.application_close_date,
            }}
            badges={rowBadges}
            urgencyDays={urgencyDays}
            matchingBadgeSlugs={matchingSlugs}
            selectedBadgeSlugs={filterBadgeSlugs.length > 0 ? filterBadgeSlugs : undefined}
          >
            {candidatureLoading ? (
              <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Chargement…</span>
              </div>
            ) : candidatureByListingId[row.listing.id] ? (
              <CandidatureStatusBlock
                status={candidatureByListingId[row.listing.id].status}
                conversationId={candidatureByListingId[row.listing.id].conversationId}
                canReapply={getListingWindowStatus(row.listing) === 'open'}
                onReapply={() => handleCandidaterClick(row)}
              />
            ) : getListingWindowStatus(row.listing) === 'open' ? (
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
                  onClick={() => handleCandidaterClick(row)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
                >
                  <Coins className="h-4 w-4" />
                  Candidater (1 crédit)
                </button>
              )
            ) : (
              <div
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium ${
                  getListingWindowStatus(row.listing) === 'upcoming'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-neutral-200 text-neutral-500'
                }`}
              >
                {getListingWindowStatus(row.listing) === 'upcoming' ? 'À venir' : 'Terminé'}
              </div>
            )}
          </BoutiqueCard>
          );
        })}
      </div>

      {filteredRows.length === 0 && !loading && (
        <div className="mt-12 rounded-2xl border border-amber-200/60 bg-white/80 p-8 sm:p-12 text-center shadow-sm">
          <p className="text-neutral-600 font-medium">
            {rows.length === 0
              ? 'Aucune annonce publiée pour le moment.'
              : 'Aucune boutique ne correspond à ces critères pour le moment. Essayez d\'élargir votre recherche.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-4 rounded-lg bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {modalRow && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setModalRow(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col" role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-3">
                <h2 id="modal-title" className="text-lg font-semibold text-neutral-900 truncate">Candidater · {modalRow.showroom.name}</h2>
                <button type="button" onClick={() => setModalRow(null)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 shrink-0" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm text-neutral-600">Choisissez l'option de rémunération qui vous convient, ou proposez un autre tarif.</p>

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
                <button type="button" onClick={() => setModalRow(null)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
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

      {confirmModalRow && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setConfirmModalRow(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 pointer-events-auto space-y-5">
              <h3 className="text-lg font-semibold text-neutral-900">
                Envoyer ma candidature à {confirmModalRow.showroom.name}
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
                  onClick={() => setConfirmModalRow(null)}
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
