'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import {
  Loader2,
  CreditCard,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  X,
  Send,
  Euro,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Calendar,
  Filter,
} from 'lucide-react';
import type {
  PaymentRequest,
  Placement,
  Product,
  Showroom,
  Brand,
  Candidature,
  ShowroomCommissionOption,
} from '@/lib/supabase';

const PLATFORM_FEE_PERCENT = 2;

type PaymentWithDetails = PaymentRequest & {
  placement?: Placement & { product?: Product; showroom?: Showroom };
  candidature?: Candidature & { showroom?: Showroom; brand?: Brand; option?: ShowroomCommissionOption };
  counterpartBrand?: Brand;
  counterpartShowroom?: Showroom;
};

const statusLabel: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepté',
  contested: 'Contesté',
  completed: 'Réglé',
  cancelled: 'Annulé',
};

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Affiche un lien vers la pièce jointe (URL publique ou signée si bucket privé). */
function AttachmentLink({ pathOrUrl, label }: { pathOrUrl: string; label: string }) {
  const [href, setHref] = useState<string | null>(pathOrUrl.startsWith('http') ? pathOrUrl : null);
  useEffect(() => {
    if (pathOrUrl.startsWith('http')) return;
    supabase.storage
      .from('payment-attachments')
      .createSignedUrl(pathOrUrl, 3600)
      .then(({ data, error }) => {
        if (!error && data?.signedUrl) setHref(data.signedUrl);
      });
  }, [pathOrUrl]);
  if (!href) return <span className="inline-flex items-center gap-1 mt-2 text-neutral-500 text-sm"><FileText className="h-4 w-4" /> {label}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-sm text-neutral-700 hover:underline">
      <FileText className="h-4 w-4" /> {label}
    </a>
  );
}

export default function PaymentsPage() {
  const { entityType, activeBrand, activeShowroom, userId } = useAdminEntity();
  const [list, setList] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal: créer demande de paiement (ventes par showroom)
  const [showCreateSales, setShowCreateSales] = useState(false);
  const [createSalesPlacementId, setCreateSalesPlacementId] = useState<string | null>(null);
  const [createSalesAmount, setCreateSalesAmount] = useState('');
  const [createSalesMotif, setCreateSalesMotif] = useState('');
  const [createSalesFile, setCreateSalesFile] = useState<File | null>(null);
  const [activePlacements, setActivePlacements] = useState<(Placement & { product?: Product; showroom?: Showroom })[]>([]);

  // Modal: créer demande de paiement (loyer par marque)
  const [showCreateRent, setShowCreateRent] = useState(false);
  const [createRentCandidatureId, setCreateRentCandidatureId] = useState<string | null>(null);
  const [createRentAmount, setCreateRentAmount] = useState('');
  const [createRentMotif, setCreateRentMotif] = useState('');
  const [createRentFile, setCreateRentFile] = useState<File | null>(null);
  const [candidaturesWithRent, setCandidaturesWithRent] = useState<(Candidature & { showroom?: Showroom; option?: ShowroomCommissionOption })[]>([]);

  // Modal unifié : Envoyer un paiement (choix du deal puis motif + pièce jointe)
  const [showSendPayment, setShowSendPayment] = useState(false);
  const [sendPaymentDealId, setSendPaymentDealId] = useState<string | null>(null);
  const [sendPaymentAmount, setSendPaymentAmount] = useState('');
  const [sendPaymentMotif, setSendPaymentMotif] = useState('');
  const [sendPaymentFile, setSendPaymentFile] = useState<File | null>(null);
  const [acceptedCandidaturesAll, setAcceptedCandidaturesAll] = useState<(Candidature & { showroom?: Showroom; option?: ShowroomCommissionOption })[]>([]);
  // Placements de la marque (pour "demander à être payé" par la boutique)
  const [brandPlacements, setBrandPlacements] = useState<(Placement & { product?: Product; showroom?: Showroom })[]>([]);
  // Candidatures acceptées du showroom (pour "demander le loyer" à la marque)
  const [showroomCandidaturesWithRent, setShowroomCandidaturesWithRent] = useState<(Candidature & { brand?: Brand; option?: ShowroomCommissionOption })[]>([]);
  // Sens de la demande : true = je paie la contrepartie, false = je demande à être payé
  const [requestAsPayer, setRequestAsPayer] = useState<boolean | null>(null);

  // Sélection manuelle marque/boutique (quand pas dans la liste des deals)
  const [showManualCounterpart, setShowManualCounterpart] = useState(false);
  const [manualSearch, setManualSearch] = useState('');
  const [manualSearchDebounced, setManualSearchDebounced] = useState('');
  const [manualBrandsList, setManualBrandsList] = useState<Brand[]>([]);
  const [manualShowroomsList, setManualShowroomsList] = useState<Showroom[]>([]);
  const [manualCounterpartId, setManualCounterpartId] = useState<number | null>(null);
  const [manualPlacements, setManualPlacements] = useState<(Placement & { product?: Product; brand?: Brand })[]>([]);
  const [manualCandidatures, setManualCandidatures] = useState<(Candidature & { brand?: Brand; showroom?: Showroom })[]>([]);
  const [noDealWarning, setNoDealWarning] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);

  // Debounce recherche manuelle (évite requêtes à chaque frappe)
  useEffect(() => {
    const t = setTimeout(() => setManualSearchDebounced(manualSearch), 300);
    return () => clearTimeout(t);
  }, [manualSearch]);

  // Filtres résumé / liste
  const [filterPeriod, setFilterPeriod] = useState<'7' | '30' | '90' | 'all'>('all');
  const [filterCounterpartIds, setFilterCounterpartIds] = useState<number[]>([]);

  // Modal: accepter / contester (marque)
  const [actionRequest, setActionRequest] = useState<PaymentWithDetails | null>(null);
  const [contestNote, setContestNote] = useState('');

  const loadPayments = useCallback(async () => {
    if ((entityType === 'brand' && !activeBrand) || (entityType === 'showroom' && !activeShowroom)) {
      setLoading(false);
      return;
    }
    const { data: rows } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false });
    const requests = (rows as PaymentRequest[]) ?? [];
    const placementIds = [...new Set(requests.map((r) => r.placement_id).filter(Boolean))] as string[];
    const candidatureIds = [...new Set(requests.map((r) => r.candidature_id).filter(Boolean))] as string[];
    const counterpartBrandIds = [...new Set(requests.map((r) => r.counterpart_brand_id).filter(Boolean))] as number[];
    const counterpartShowroomIds = [...new Set(requests.map((r) => r.counterpart_showroom_id).filter(Boolean))] as number[];
    let placementMap: Record<string, Placement & { product?: Product; showroom?: Showroom }> = {};
    let candidatureMap: Record<string, Candidature & { showroom?: Showroom; brand?: Brand; option?: ShowroomCommissionOption }> = {};
    let counterpartBrandMap: Record<number, Brand> = {};
    let counterpartShowroomMap: Record<number, Showroom> = {};
    if (placementIds.length > 0) {
      const { data: plList } = await supabase.from('placements').select('*').in('id', placementIds);
      const placements = (plList as Placement[]) ?? [];
      const productIds = [...new Set(placements.map((p) => p.product_id))];
      const showroomIds = [...new Set(placements.map((p) => p.showroom_id))];
      const [prodRes, showRes] = await Promise.all([
        supabase.from('products').select('id, product_name, brand_id').in('id', productIds),
        supabase.from('showrooms').select('id, name').in('id', showroomIds),
      ]);
      const productMap = Object.fromEntries(((prodRes.data as Product[]) ?? []).map((p) => [p.id, p]));
      const showroomMap = Object.fromEntries(((showRes.data as Showroom[]) ?? []).map((s) => [s.id, s]));
      placements.forEach((p) => {
        placementMap[p.id] = {
          ...p,
          product: productMap[p.product_id],
          showroom: showroomMap[p.showroom_id],
        };
      });
    }
    if (candidatureIds.length > 0) {
      const { data: cList } = await supabase.from('candidatures').select('*').in('id', candidatureIds);
      const candidatures = (cList as Candidature[]) ?? [];
      const showroomIds = [...new Set(candidatures.map((c) => c.showroom_id))];
      const brandIds = [...new Set(candidatures.map((c) => c.brand_id))];
      const optionIds = candidatures.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
      const [showRes, brandRes, optRes] = await Promise.all([
        supabase.from('showrooms').select('id, name').in('id', showroomIds),
        supabase.from('brands').select('id, brand_name').in('id', brandIds),
        optionIds.length > 0 ? supabase.from('showroom_commission_options').select('*').in('id', optionIds) : Promise.resolve({ data: [] }),
      ]);
      const showroomMap = Object.fromEntries(((showRes.data as Showroom[]) ?? []).map((s) => [s.id, s]));
      const brandMap = Object.fromEntries(((brandRes.data as Brand[]) ?? []).map((b) => [b.id, b]));
      const optionMap = Object.fromEntries(((optRes.data as ShowroomCommissionOption[]) ?? []).map((o) => [o.id, o]));
      candidatures.forEach((c) => {
        candidatureMap[c.id] = {
          ...c,
          showroom: showroomMap[c.showroom_id],
          brand: brandMap[c.brand_id],
          option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
        };
      });
    }
    if (counterpartBrandIds.length > 0) {
      const { data: brandsData } = await supabase.from('brands').select('id, brand_name').in('id', counterpartBrandIds);
      counterpartBrandMap = Object.fromEntries(((brandsData as Brand[]) ?? []).map((b) => [b.id, b]));
    }
    if (counterpartShowroomIds.length > 0) {
      const { data: showroomsData } = await supabase.from('showrooms').select('id, name').in('id', counterpartShowroomIds);
      counterpartShowroomMap = Object.fromEntries(((showroomsData as Showroom[]) ?? []).map((s) => [s.id, s]));
    }
    setList(
      requests.map((r) => ({
        ...r,
        placement: r.placement_id ? placementMap[r.placement_id] : undefined,
        candidature: r.candidature_id ? candidatureMap[r.candidature_id] : undefined,
        counterpartBrand: r.counterpart_brand_id ? counterpartBrandMap[r.counterpart_brand_id] : undefined,
        counterpartShowroom: r.counterpart_showroom_id ? counterpartShowroomMap[r.counterpart_showroom_id] : undefined,
      }))
    );
    setLoading(false);
  }, [entityType, activeBrand?.id, activeShowroom?.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Charger les placements (showroom) pour le formulaire "demande paiement" : pending, active, sold
  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom) return;
    (async () => {
      const { data: plList } = await supabase
        .from('placements')
        .select('*')
        .eq('showroom_id', activeShowroom.id)
        .in('status', ['pending', 'active', 'sold']);
      const placements = (plList as Placement[]) ?? [];
      if (placements.length === 0) {
        setActivePlacements([]);
        return;
      }
      const productIds = [...new Set(placements.map((p) => p.product_id))];
      const { data: products } = await supabase.from('products').select('id, product_name, brand_id').in('id', productIds);
      const productsList = (products as (Product & { brand_id?: number })[]) ?? [];
      const productMap = Object.fromEntries(productsList.map((p) => [p.id, p]));
      const brandIds = [...new Set(productsList.map((p) => p.brand_id).filter(Boolean))] as number[];
      const { data: brands } = await supabase.from('brands').select('id, brand_name').in('id', brandIds);
      const brandMap = Object.fromEntries(((brands as Brand[]) ?? []).map((b) => [b.id, b]));
      setActivePlacements(
        placements.map((p) => {
          const prod = productMap[p.product_id];
          return {
            ...p,
            product: prod ? { ...prod, brand: prod.brand_id ? brandMap[prod.brand_id] : undefined } : undefined,
            showroom: { id: activeShowroom.id, name: activeShowroom.name } as Showroom,
          };
        })
      );
    })();
  }, [entityType, activeShowroom]);

  // Charger les candidatures acceptées avec loyer (marque) pour le formulaire "demande paiement loyer"
  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand) return;
    (async () => {
      const { data: cList } = await supabase
        .from('candidatures')
        .select('*')
        .eq('brand_id', activeBrand.id)
        .eq('status', 'accepted');
      const candidatures = (cList as Candidature[]) ?? [];
      const optionIds = candidatures.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
      if (optionIds.length === 0) {
        setCandidaturesWithRent([]);
        return;
      }
      const { data: opts } = await supabase.from('showroom_commission_options').select('*').in('id', optionIds);
      const options = (opts as ShowroomCommissionOption[]) ?? [];
      const withRent = options.filter((o) => o.rent != null && o.rent > 0);
      const candidatureIdsWithRent = new Set(candidatures.filter((c) => withRent.some((o) => o.id === c.showroom_commission_option_id)).map((c) => c.id));
      const toShow = candidatures.filter((c) => candidatureIdsWithRent.has(c.id));
      const showroomIds = [...new Set(toShow.map((c) => c.showroom_id))];
      const { data: showrooms } = await supabase.from('showrooms').select('id, name').in('id', showroomIds);
      const showroomMap = Object.fromEntries(((showrooms as Showroom[]) ?? []).map((s) => [s.id, s]));
      const optionMap = Object.fromEntries(options.map((o) => [o.id, o]));
      setCandidaturesWithRent(
        toShow.map((c) => ({
          ...c,
          showroom: showroomMap[c.showroom_id],
          option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
        }))
      );
    })();
  }, [entityType, activeBrand?.id]);

  // Candidatures acceptées (toutes, pour le flux "Envoyer un paiement" côté marque)
  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand) return;
    (async () => {
      const { data: cList } = await supabase.from('candidatures').select('*').eq('brand_id', activeBrand.id).eq('status', 'accepted');
      const candidatures = (cList as Candidature[]) ?? [];
      if (candidatures.length === 0) {
        setAcceptedCandidaturesAll([]);
        return;
      }
      const showroomIds = [...new Set(candidatures.map((c) => c.showroom_id))];
      const optionIds = candidatures.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
      const [showRes, optRes] = await Promise.all([
        supabase.from('showrooms').select('id, name').in('id', showroomIds),
        optionIds.length > 0 ? supabase.from('showroom_commission_options').select('*').in('id', optionIds) : Promise.resolve({ data: [] }),
      ]);
      const showroomMap = Object.fromEntries(((showRes.data as Showroom[]) ?? []).map((s) => [s.id, s]));
      const optionMap = Object.fromEntries(((optRes.data as ShowroomCommissionOption[]) ?? []).map((o) => [o.id, o]));
      setAcceptedCandidaturesAll(
        candidatures.map((c) => ({
          ...c,
          showroom: showroomMap[c.showroom_id],
          option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
        }))
      );
    })();
  }, [entityType, activeBrand?.id]);

  // Placements de la marque (deals actifs) pour "demander à être payé"
  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand) return;
    (async () => {
      const { data: productsData } = await supabase.from('products').select('id').eq('brand_id', activeBrand.id);
      const products = (productsData as { id: number }[]) ?? [];
      if (products.length === 0) {
        setBrandPlacements([]);
        return;
      }
      const productIds = products.map((p) => p.id);
      const { data: plList } = await supabase
        .from('placements')
        .select('*')
        .in('product_id', productIds)
        .in('status', ['pending', 'active', 'sold']);
      const placements = (plList as Placement[]) ?? [];
      if (placements.length === 0) {
        setBrandPlacements([]);
        return;
      }
      const showroomIds = [...new Set(placements.map((p) => p.showroom_id))];
      const [showRes, prodRes] = await Promise.all([
        supabase.from('showrooms').select('id, name').in('id', showroomIds),
        supabase.from('products').select('id, product_name').in('id', productIds),
      ]);
      const showroomMap = Object.fromEntries(((showRes.data as Showroom[]) ?? []).map((s) => [s.id, s]));
      const productNameMap = Object.fromEntries(((prodRes.data as Product[]) ?? []).map((p) => [p.id, p]));
      setBrandPlacements(
        placements.map((p) => ({
          ...p,
          product: productNameMap[p.product_id],
          showroom: showroomMap[p.showroom_id],
        }))
      );
    })();
  }, [entityType, activeBrand?.id]);

  // Candidatures acceptées du showroom (toutes, pour "demander le loyer" et activer le bouton)
  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom) return;
    (async () => {
      const { data: cList } = await supabase
        .from('candidatures')
        .select('*')
        .eq('showroom_id', activeShowroom.id)
        .eq('status', 'accepted');
      const candidatures = (cList as Candidature[]) ?? [];
      if (candidatures.length === 0) {
        setShowroomCandidaturesWithRent([]);
        return;
      }
      const optionIds = candidatures.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
      const brandIds = [...new Set(candidatures.map((c) => c.brand_id))];
      const [optsRes, brandsRes] = await Promise.all([
        optionIds.length > 0 ? supabase.from('showroom_commission_options').select('*').in('id', optionIds) : { data: [] as ShowroomCommissionOption[] },
        supabase.from('brands').select('id, brand_name').in('id', brandIds),
      ]);
      const options = (optsRes.data as ShowroomCommissionOption[]) ?? [];
      const brandMap = Object.fromEntries(((brandsRes.data as Brand[]) ?? []).map((b) => [b.id, b]));
      const optionMap = Object.fromEntries(options.map((o) => [o.id, o]));
      setShowroomCandidaturesWithRent(
        candidatures.map((c) => ({
          ...c,
          brand: brandMap[c.brand_id],
          option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
        }))
      );
    })();
  }, [entityType, activeShowroom?.id]);

  // Charger les marques pour la sélection manuelle (showroom)
  useEffect(() => {
    if (!showManualCounterpart || entityType !== 'showroom') return;
    setLoadingManual(true);
    (async () => {
      let query = supabase.from('brands').select('id, brand_name').order('brand_name');
      if (manualSearchDebounced.trim()) query = query.ilike('brand_name', `%${manualSearchDebounced}%`);
      const { data } = await query.limit(50);
      setManualBrandsList((data as Brand[]) ?? []);
      setLoadingManual(false);
    })();
  }, [showManualCounterpart, entityType, manualSearchDebounced]);

  // Charger les showrooms pour la sélection manuelle (marque) : boutiques avec deal accepté en premier
  useEffect(() => {
    if (!showManualCounterpart || entityType !== 'brand' || !activeBrand) return;
    setLoadingManual(true);
    (async () => {
      let query = supabase.from('showrooms').select('id, name').order('name');
      if (manualSearchDebounced.trim()) query = query.ilike('name', `%${manualSearchDebounced}%`);
      const { data: showroomsData } = await query.limit(50);
      const list = (showroomsData as Showroom[]) ?? [];
      // Boutiques avec un deal accepté (candidature ou placement) en tête de liste
      const [candRes, plRes] = await Promise.all([
        supabase.from('candidatures').select('showroom_id').eq('brand_id', activeBrand.id).eq('status', 'accepted'),
        supabase.from('products').select('id').eq('brand_id', activeBrand.id).then(async ({ data: prods }) => {
          const ids = ((prods as { id: number }[]) ?? []).map((p) => p.id);
          if (ids.length === 0) return { data: [] as { showroom_id: number }[] };
          return supabase.from('placements').select('showroom_id').in('product_id', ids).in('status', ['pending', 'active', 'sold']);
        }),
      ]);
      const fromCand = new Set(((candRes.data as { showroom_id: number }[]) ?? []).map((r) => r.showroom_id));
      const fromPl = new Set(((plRes.data as { showroom_id: number }[]) ?? []).map((r) => r.showroom_id));
      const withDealIds = new Set([...fromCand, ...fromPl]);
      const sorted = [...list].sort((a, b) => {
        const aDeal = withDealIds.has(a.id) ? 1 : 0;
        const bDeal = withDealIds.has(b.id) ? 1 : 0;
        if (bDeal !== aDeal) return bDeal - aDeal;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
      setManualShowroomsList(sorted);
      setLoadingManual(false);
    })();
  }, [showManualCounterpart, entityType, manualSearchDebounced, activeBrand?.id]);

  // Quand on sélectionne une marque manuellement (showroom) : chercher les placements
  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom || !requestAsPayer || !manualCounterpartId) {
      setManualPlacements([]);
      setNoDealWarning(false);
      return;
    }
    (async () => {
      const { data: products } = await supabase.from('products').select('id').eq('brand_id', manualCounterpartId);
      const productIds = ((products as { id: number }[]) ?? []).map((p) => p.id);
      if (productIds.length === 0) {
        setManualPlacements([]);
        setNoDealWarning(true);
        return;
      }
      const { data: plList } = await supabase
        .from('placements')
        .select('*')
        .eq('showroom_id', activeShowroom.id)
        .in('product_id', productIds)
        .in('status', ['pending', 'active', 'sold']);
      const placements = (plList as Placement[]) ?? [];
      if (placements.length === 0) {
        setManualPlacements([]);
        setNoDealWarning(true);
        return;
      }
      const { data: prods } = await supabase.from('products').select('id, product_name, brand_id').in('id', productIds);
      const { data: brands } = await supabase.from('brands').select('id, brand_name').in('id', [manualCounterpartId]);
      const productMap = Object.fromEntries(((prods as Product[]) ?? []).map((p) => [p.id, p]));
      const brandMap = Object.fromEntries(((brands as Brand[]) ?? []).map((b) => [b.id, b]));
      setManualPlacements(
        placements.map((p) => ({
          ...p,
          product: productMap[p.product_id],
          brand: brandMap[manualCounterpartId],
        }))
      );
      setNoDealWarning(false);
    })();
  }, [entityType, activeShowroom?.id, requestAsPayer, manualCounterpartId]);

  // Quand on sélectionne une boutique manuellement (marque, Je paie) : chercher les candidatures
  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand || !requestAsPayer || !manualCounterpartId) {
      if (entityType === 'brand' && requestAsPayer) setManualCandidatures([]);
      setNoDealWarning(false);
      return;
    }
    (async () => {
      const { data: cList } = await supabase
        .from('candidatures')
        .select('*')
        .eq('brand_id', activeBrand.id)
        .eq('showroom_id', manualCounterpartId)
        .eq('status', 'accepted');
      const candidatures = (cList as Candidature[]) ?? [];
      if (candidatures.length === 0) {
        setManualCandidatures([]);
        setNoDealWarning(true);
        return;
      }
      const { data: showrooms } = await supabase.from('showrooms').select('id, name').in('id', [manualCounterpartId]);
      const showroomMap = Object.fromEntries(((showrooms as Showroom[]) ?? []).map((s) => [s.id, s]));
      setManualCandidatures(
        candidatures.map((c) => ({ ...c, showroom: showroomMap[c.showroom_id] }))
      );
      setNoDealWarning(false);
    })();
  }, [entityType, activeBrand?.id, requestAsPayer, manualCounterpartId]);

  // Quand la marque sélectionne une boutique manuellement (Je demande à être payé) : chercher les placements
  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand || requestAsPayer !== false || !manualCounterpartId) {
      if (entityType !== 'brand' || requestAsPayer) return;
      setManualPlacements([]);
      setNoDealWarning(false);
      return;
    }
    (async () => {
      const { data: products } = await supabase.from('products').select('id').eq('brand_id', activeBrand.id);
      const productIds = ((products as { id: number }[]) ?? []).map((p) => p.id);
      if (productIds.length === 0) {
        setManualPlacements([]);
        setNoDealWarning(true);
        return;
      }
      const { data: plList } = await supabase
        .from('placements')
        .select('*')
        .eq('showroom_id', manualCounterpartId)
        .in('product_id', productIds)
        .in('status', ['pending', 'active', 'sold']);
      const placements = (plList as Placement[]) ?? [];
      if (placements.length === 0) {
        setManualPlacements([]);
        setNoDealWarning(true);
        return;
      }
      const { data: prods } = await supabase.from('products').select('id, product_name').in('id', productIds);
      const productMap = Object.fromEntries(((prods as Product[]) ?? []).map((p) => [p.id, p]));
      setManualPlacements(placements.map((p) => ({ ...p, product: productMap[p.product_id] })));
      setNoDealWarning(false);
    })();
  }, [entityType, activeBrand?.id, requestAsPayer, manualCounterpartId]);

  // Quand la boutique sélectionne une marque manuellement (Je demande à être payé) : chercher les candidatures
  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom || requestAsPayer !== false || !manualCounterpartId) {
      if (entityType !== 'showroom' || requestAsPayer) return;
      setManualCandidatures([]);
      setNoDealWarning(false);
      return;
    }
    (async () => {
      const { data: cList } = await supabase
        .from('candidatures')
        .select('*')
        .eq('showroom_id', activeShowroom.id)
        .eq('brand_id', manualCounterpartId)
        .eq('status', 'accepted');
      const candidatures = (cList as Candidature[]) ?? [];
      if (candidatures.length === 0) {
        setManualCandidatures([]);
        setNoDealWarning(true);
        return;
      }
      const { data: brands } = await supabase.from('brands').select('id, brand_name').in('id', [manualCounterpartId]);
      const brandMap = Object.fromEntries(((brands as Brand[]) ?? []).map((b) => [b.id, b]));
      setManualCandidatures(
        candidatures.map((c) => ({ ...c, brand: brandMap[c.brand_id] }))
      );
      setNoDealWarning(false);
    })();
  }, [entityType, activeShowroom?.id, requestAsPayer, manualCounterpartId]);

  // Pré-sélectionner le premier placement/candidature en mode manuel quand un seul choix
  useEffect(() => {
    if (entityType === 'showroom' && requestAsPayer && manualPlacements.length > 0 && manualCounterpartId) {
      setSendPaymentDealId((id) => (id && manualPlacements.some((p) => p.id === id)) ? id : manualPlacements[0].id);
    }
  }, [entityType, requestAsPayer, manualPlacements, manualCounterpartId]);
  useEffect(() => {
    if (entityType === 'brand' && requestAsPayer && manualCandidatures.length > 0 && manualCounterpartId) {
      setSendPaymentDealId((id) => (id && manualCandidatures.some((c) => c.id === id)) ? id : manualCandidatures[0].id);
    }
  }, [entityType, requestAsPayer, manualCandidatures, manualCounterpartId]);
  useEffect(() => {
    if (entityType === 'brand' && !requestAsPayer && manualPlacements.length > 0 && manualCounterpartId) {
      setSendPaymentDealId((id) => (id && manualPlacements.some((p) => p.id === id)) ? id : manualPlacements[0].id);
    }
  }, [entityType, requestAsPayer, manualPlacements, manualCounterpartId]);
  useEffect(() => {
    if (entityType === 'showroom' && !requestAsPayer && manualCandidatures.length > 0 && manualCounterpartId) {
      setSendPaymentDealId((id) => (id && manualCandidatures.some((c) => c.id === id)) ? id : manualCandidatures[0].id);
    }
  }, [entityType, requestAsPayer, manualCandidatures, manualCounterpartId]);

  async function handleCreateSalesPayment() {
    if (!createSalesPlacementId || !createSalesAmount.trim() || !activeShowroom) return;
    const amountCents = Math.round(parseFloat(createSalesAmount.replace(',', '.')) * 100);
    if (Number.isNaN(amountCents) || amountCents <= 0) {
      setError('Montant invalide.');
      return;
    }
    const platformFeeCents = Math.ceil(amountCents * (PLATFORM_FEE_PERCENT / 100));
    setError(null);
    setSubmitting(true);
    try {
      let attachmentUrl: string | null = null;
      if (createSalesFile) {
        const ext = createSalesFile.name.split('.').pop() || 'pdf';
        const path = `showrooms/${activeShowroom.id}/${createSalesPlacementId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('payment-attachments').upload(path, createSalesFile, { upsert: true });
        if (upErr) {
          setError('Échec upload pièce jointe : ' + upErr.message);
          setSubmitting(false);
          return;
        }
        // Stocker le chemin (bucket privé) ; l’affichage utilisera des URLs signées
        attachmentUrl = path;
      }
      const { error: payErr } = await supabase.from('payment_requests').insert({
        type: 'sales',
        placement_id: createSalesPlacementId,
        amount_cents: amountCents,
        platform_fee_cents: platformFeeCents,
        initiator_side: 'showroom',
        motif: createSalesMotif.trim() || null,
        sales_report_attachment_url: attachmentUrl,
        status: 'pending',
      });
      if (payErr) {
        setError(payErr.message || 'Erreur création demande.');
        return;
      }
      setShowCreateSales(false);
      setCreateSalesPlacementId(null);
      setCreateSalesAmount('');
      setCreateSalesMotif('');
      setCreateSalesFile(null);
      await loadPayments();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateRentPayment() {
    if (!createRentCandidatureId || !createRentAmount.trim() || !activeBrand) return;
    const amountCents = Math.round(parseFloat(createRentAmount.replace(',', '.')) * 100);
    if (Number.isNaN(amountCents) || amountCents <= 0) {
      setError('Montant invalide.');
      return;
    }
    const platformFeeCents = Math.ceil(amountCents * (PLATFORM_FEE_PERCENT / 100));
    setError(null);
    setSubmitting(true);
    try {
      let attachmentPath: string | null = null;
      if (createRentFile) {
        const ext = createRentFile.name.split('.').pop() || 'pdf';
        const path = `brands/${activeBrand.id}/${createRentCandidatureId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('payment-attachments').upload(path, createRentFile, { upsert: true });
        if (upErr) {
          setError('Échec upload pièce jointe : ' + upErr.message);
          setSubmitting(false);
          return;
        }
        attachmentPath = path;
      }
      const { error: payErr } = await supabase.from('payment_requests').insert({
        type: 'rent',
        candidature_id: createRentCandidatureId,
        amount_cents: amountCents,
        platform_fee_cents: platformFeeCents,
        initiator_side: 'brand',
        motif: createRentMotif.trim() || null,
        sales_report_attachment_url: attachmentPath,
        status: 'pending',
      });
      if (payErr) {
        setError(payErr.message || 'Erreur création demande.');
        return;
      }
      setShowCreateRent(false);
      setCreateRentCandidatureId(null);
      setCreateRentAmount('');
      setCreateRentMotif('');
      setCreateRentFile(null);
      await loadPayments();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendPayment() {
    const asBrand = entityType === 'brand';
    const noDealRentShowroom = !asBrand && requestAsPayer === false && noDealWarning && manualCounterpartId != null;
    const hasDealOrCounterpart = sendPaymentDealId || noDealRentShowroom;
    if (requestAsPayer === null || !hasDealOrCounterpart || !sendPaymentAmount.trim()) return;
    const amountCents = Math.round(parseFloat(sendPaymentAmount.replace(',', '.')) * 100);
    if (Number.isNaN(amountCents) || amountCents <= 0) {
      setError('Montant invalide.');
      return;
    }
    const platformFeeCents = Math.ceil(amountCents * (PLATFORM_FEE_PERCENT / 100));
    setError(null);
    setSubmitting(true);
    const type: 'sales' | 'rent' = asBrand ? (requestAsPayer ? 'rent' : 'sales') : (requestAsPayer ? 'sales' : 'rent');
    const initiator_side: 'brand' | 'showroom' = asBrand ? 'brand' : 'showroom';
    const placement_id = type === 'sales' && (asBrand ? !requestAsPayer : requestAsPayer) ? sendPaymentDealId : null;
    const candidature_id = type === 'rent' && !noDealRentShowroom && (asBrand ? requestAsPayer : !requestAsPayer) ? sendPaymentDealId : null;
    const counterpart_brand_id = noDealRentShowroom ? manualCounterpartId : null;
    const counterpart_showroom_id = null;
    if ((type === 'sales' && !placement_id) || (type === 'rent' && !candidature_id && !counterpart_brand_id && !counterpart_showroom_id)) {
      setError('Veuillez choisir un accord ou une contrepartie.');
      setSubmitting(false);
      return;
    }
    try {
      let attachmentPath: string | null = null;
      if (sendPaymentFile) {
        const ext = sendPaymentFile.name.split('.').pop() || 'pdf';
        const folder = asBrand ? `brands/${activeBrand!.id}` : `showrooms/${activeShowroom!.id}`;
        const path = noDealRentShowroom
          ? `${folder}/no-deal-${manualCounterpartId}-${Date.now()}.${ext}`
          : `${folder}/${sendPaymentDealId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('payment-attachments').upload(path, sendPaymentFile, { upsert: true });
        if (upErr) {
          setError('Échec upload pièce jointe : ' + upErr.message);
          setSubmitting(false);
          return;
        }
        attachmentPath = path;
      }
      const { error: payErr } = await supabase.from('payment_requests').insert({
        type,
        placement_id: placement_id || null,
        candidature_id: candidature_id || null,
        counterpart_brand_id: counterpart_brand_id ?? null,
        counterpart_showroom_id: counterpart_showroom_id ?? null,
        amount_cents: amountCents,
        platform_fee_cents: platformFeeCents,
        initiator_side,
        motif: sendPaymentMotif.trim() || null,
        sales_report_attachment_url: attachmentPath,
        status: 'pending',
      });
      if (payErr) {
        setError(payErr.message || 'Erreur création demande.');
        setSubmitting(false);
        return;
      }
      setShowSendPayment(false);
      setRequestAsPayer(null);
      setSendPaymentDealId(null);
      setSendPaymentAmount('');
      setSendPaymentMotif('');
      setSendPaymentFile(null);
      setShowManualCounterpart(false);
      setManualCounterpartId(null);
      setNoDealWarning(false);
      await loadPayments();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptPayment(id: string) {
    setSubmitting(true);
    setError(null);
    try {
      const { error: upErr } = await supabase.from('payment_requests').update({ status: 'accepted', contest_note: null }).eq('id', id);
      if (upErr) {
        setError(upErr.message);
        return;
      }
      setActionRequest(null);
      setContestNote('');
      await loadPayments();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleContestPayment(id: string) {
    if (!contestNote.trim()) {
      setError('Indiquez un motif de contestation.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: upErr } = await supabase.from('payment_requests').update({ status: 'contested', contest_note: contestNote.trim() }).eq('id', id);
      if (upErr) {
        setError(upErr.message);
        return;
      }
      setActionRequest(null);
      setContestNote('');
      await loadPayments();
    } finally {
      setSubmitting(false);
    }
  }

  const asBrand = entityType === 'brand';
  // À valider = demandes où je suis le bénéficiaire (je reçois le montant) : marque reçoit si type sales, showroom reçoit si type rent
  const incomingForMe = list.filter((r) => (asBrand && r.type === 'sales') || (!asBrand && r.type === 'rent'));
  const pendingIncoming = incomingForMe.filter((r) => r.status === 'pending');

  // Contrepartie d'une demande : marque (côté showroom) ou boutique (côté marque)
  function getCounterpartId(r: PaymentWithDetails): number | null {
    if (asBrand) {
      return r.placement?.showroom_id ?? r.candidature?.showroom_id ?? r.counterpart_showroom_id ?? null;
    }
    return r.placement?.product?.brand_id ?? r.candidature?.brand_id ?? r.counterpart_brand_id ?? null;
  }
  const counterpartEntries = (() => {
    const seen = new Set<number>();
    const names: Record<number, string> = {};
    list.forEach((r) => {
      const id = getCounterpartId(r);
      if (id != null && !seen.has(id)) {
        seen.add(id);
        names[id] = asBrand ? (r.placement?.showroom?.name ?? r.candidature?.showroom?.name ?? r.counterpartShowroom?.name ?? 'Boutique') : (r.candidature?.brand?.brand_name ?? r.counterpartBrand?.brand_name ?? 'Marque');
      }
    });
    return Object.entries(names).map(([id, name]) => ({ id: Number(id), name }));
  })();
  counterpartEntries.sort((a, b) => a.name.localeCompare(b.name));

  const now = Date.now();
  const periodMs = filterPeriod === 'all' ? 0 : parseInt(filterPeriod, 10) * 24 * 60 * 60 * 1000;
  const filteredList = list.filter((r) => {
    if (periodMs > 0 && r.created_at) {
      const t = new Date(r.created_at).getTime();
      if (now - t > periodMs) return false;
    }
    if (filterCounterpartIds.length > 0) {
      const id = getCounterpartId(r);
      if (id == null || !filterCounterpartIds.includes(id)) return false;
    }
    return true;
  });

  const settledStatuses = ['accepted', 'completed'];
  const receivedTotal = filteredList
    .filter((r) => ((asBrand && r.type === 'sales') || (!asBrand && r.type === 'rent')) && settledStatuses.includes(r.status))
    .reduce((sum, r) => sum + r.amount_cents, 0);
  const sentTotal = filteredList
    .filter((r) => ((asBrand && r.type === 'rent') || (!asBrand && r.type === 'sales')) && settledStatuses.includes(r.status))
    .reduce((sum, r) => sum + r.amount_cents, 0);
  const netTotal = receivedTotal - sentTotal;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Mes paiements</h1>
        <div className="flex flex-wrap gap-2" />
      </div>

      {/* Cartes résumé */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-xl border-2 border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium">
            <ArrowDownCircle className="h-4 w-4" />
            Reçus
          </div>
          <p className="mt-1 text-xl font-semibold text-neutral-900">{formatAmount(receivedTotal)}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Acceptés / réglés</p>
        </div>
        <div className="rounded-xl border-2 border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium">
            <ArrowUpCircle className="h-4 w-4" />
            Envoyés
          </div>
          <p className="mt-1 text-xl font-semibold text-neutral-900">{formatAmount(sentTotal)}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Acceptés / réglés</p>
        </div>
        <div className="rounded-xl border-2 border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-neutral-500 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            Net
          </div>
          <p className={`mt-1 text-xl font-semibold ${netTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatAmount(netTotal)}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Reçus − Envoyés</p>
        </div>
      </section>

      {/* Filtres période + marques/boutiques */}
      <section className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="h-4 w-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700">Période</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['7', '30', '90', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterPeriod === p ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'}`}
            >
              {p === 'all' ? 'Tout' : `${p} jours`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0 sm:ml-4">
          <Filter className="h-4 w-4 text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700">{asBrand ? 'Boutique' : 'Marque'}</span>
        </div>
        <select
          value={filterCounterpartIds.length === 0 ? '' : String(filterCounterpartIds[0])}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) setFilterCounterpartIds([]);
            else setFilterCounterpartIds([Number(v)]);
          }}
          className="px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm min-w-[160px]"
        >
          <option value="">Toutes</option>
          {counterpartEntries.map(({ id, name }) => (
            <option key={id} value={String(id)}>{name}</option>
          ))}
        </select>
      </section>

      <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => { setShowSendPayment(true); setRequestAsPayer(null); setSendPaymentDealId(null); setSendPaymentAmount(''); setSendPaymentMotif(''); setSendPaymentFile(null); setShowManualCounterpart(false); setManualCounterpartId(null); setManualSearch(''); setNoDealWarning(false); }}
            disabled={asBrand && acceptedCandidaturesAll.length === 0 && brandPlacements.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" /> Demander un paiement
          </button>
          {asBrand && candidaturesWithRent.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCreateRent(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 font-medium hover:bg-neutral-50"
            >
              <Euro className="h-4 w-4" /> Paiement loyer
            </button>
          )}
          {!asBrand && activePlacements.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCreateSales(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 font-medium hover:bg-neutral-50"
            >
              <Upload className="h-4 w-4" /> Paiement ventes
            </button>
          )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {pendingIncoming.length > 0 && asBrand && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">À valider (ventes)</h2>
          <ul className="space-y-3">
            {pendingIncoming.map((r) => (
              <li key={r.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {r.placement?.product?.product_name ?? 'Produit'} · {r.placement?.showroom?.name ?? 'Boutique'}
                    </p>
                    <p className="text-sm text-neutral-600 mt-1">
                      La contrepartie recevra {formatAmount(r.amount_cents)}. Frais de service en supplément : {formatAmount(r.platform_fee_cents)} (à la charge de la boutique, pour soutenir la plateforme).
                    </p>
                    {r.motif && <p className="text-sm text-neutral-700 mt-1">Motif : {r.motif}</p>}
                    {r.sales_report_attachment_url && (
                      <AttachmentLink pathOrUrl={r.sales_report_attachment_url} label="Rapport de ventes" />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptPayment(r.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" /> Accepter
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionRequest(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50"
                    >
                      <XCircle className="h-4 w-4" /> Contester
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingIncoming.length > 0 && !asBrand && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">À valider (loyers)</h2>
          <ul className="space-y-3">
            {pendingIncoming.map((r) => (
              <li key={r.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-neutral-900">
                      {r.candidature?.brand?.brand_name ?? r.counterpartBrand?.brand_name ?? 'Marque'} · Loyer
                    </p>
                    <p className="text-sm text-neutral-600 mt-1">Vous recevrez {formatAmount(r.amount_cents)}. Des frais de service s&apos;ajoutent au moment du paiement pour soutenir la plateforme.</p>
                    {r.motif && <p className="text-sm text-neutral-700 mt-1">Motif : {r.motif}</p>}
                    {r.sales_report_attachment_url && <AttachmentLink pathOrUrl={r.sales_report_attachment_url} label="Pièce jointe" />}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptPayment(r.id)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle className="h-4 w-4" /> Accepter
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">Toutes les demandes</h2>
        {filteredList.length === 0 ? (
          <p className="text-neutral-500 py-8 text-center">
            {list.length === 0 ? 'Aucune demande de paiement pour le moment.' : 'Aucun paiement ne correspond aux filtres.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {filteredList.map((r) => (
              <li key={r.id} className="p-4 rounded-xl border border-neutral-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-medium text-neutral-500 uppercase">
                      {r.type === 'sales' ? 'Ventes' : 'Loyer'} · {r.initiator_side === 'brand' ? 'Demandé par la marque' : 'Demandé par la boutique'}
                    </span>
                    <p className="font-medium text-neutral-900 mt-0.5">
                      {r.type === 'sales'
                        ? `${r.placement?.product?.product_name ?? '—'} · ${r.placement?.showroom?.name ?? '—'}`
                        : `${r.candidature?.brand?.brand_name ?? r.counterpartBrand?.brand_name ?? '—'} → ${r.candidature?.showroom?.name ?? r.counterpartShowroom?.name ?? '—'}`}
                    </p>
                    <p className="text-sm text-neutral-600 mt-1">
                      {formatAmount(r.amount_cents)}
                      {r.platform_fee_cents > 0 && (
                        <span className="text-neutral-500"> (frais de service : {formatAmount(r.platform_fee_cents)})</span>
                      )}
                    </p>
                    {r.motif && <p className="text-sm text-neutral-700 mt-1">Motif : {r.motif}</p>}
                    {r.status === 'contested' && r.contest_note && (
                      <p className="mt-2 text-sm text-amber-800 bg-amber-100/80 rounded-lg px-2 py-1">Note : {r.contest_note}</p>
                    )}
                    {(r.sales_report_attachment_url) && (
                      <AttachmentLink pathOrUrl={r.sales_report_attachment_url} label="Pièce jointe" />
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                      r.status === 'pending' ? 'bg-neutral-100 text-neutral-700' : r.status === 'accepted' || r.status === 'completed' ? 'bg-green-100 text-green-800' : r.status === 'contested' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modal : créer demande paiement ventes (showroom) */}
      {showCreateSales && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setShowCreateSales(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Demande de paiement (ventes)</h3>
                <button type="button" onClick={() => setShowCreateSales(false)} className="p-2 rounded-lg hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                Le montant indiqué est ce que le créateur recevra. Des frais de service (2 %) s&apos;ajoutent au moment du paiement pour soutenir la plateforme. Si le créateur accepte, le paiement est enclenché.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Placement / Deal</label>
                  <select
                    value={createSalesPlacementId ?? ''}
                    onChange={(e) => setCreateSalesPlacementId(e.target.value || null)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
                  >
                    <option value="">Choisir…</option>
                    {activePlacements.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product?.product_name ?? 'Produit'} · {p.showroom?.name ?? ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Montant que recevra le créateur (€)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={createSalesAmount}
                    onChange={(e) => setCreateSalesAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Frais de service (2 %) au moment du paiement pour soutenir la plateforme (ex. 300€ → vous payez 306€, le créateur reçoit 300€).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Motif du paiement</label>
                  <input
                    type="text"
                    value={createSalesMotif}
                    onChange={(e) => setCreateSalesMotif(e.target.value)}
                    placeholder="Ex. Règlement ventes période janvier"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm placeholder:text-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Pièce jointe (optionnel)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                    onChange={(e) => setCreateSalesFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-neutral-600 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border file:border-neutral-200 file:bg-neutral-50"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreateSales(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium">
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!createSalesPlacementId || !createSalesAmount.trim() || submitting}
                  onClick={handleCreateSalesPayment}
                  className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Envoyer la demande
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal : créer demande paiement loyer (marque) */}
      {showCreateRent && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setShowCreateRent(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Demande de paiement (loyer)</h3>
                <button type="button" onClick={() => setShowCreateRent(false)} className="p-2 rounded-lg hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                Le montant indiqué est ce que la boutique recevra. Des frais de service (2 %) s&apos;ajoutent au moment du paiement pour soutenir la plateforme. Si la boutique accepte, le paiement est enclenché.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Accord avec boutique (loyer)</label>
                  <select
                    value={createRentCandidatureId ?? ''}
                    onChange={(e) => setCreateRentCandidatureId(e.target.value || null)}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
                  >
                    <option value="">Choisir…</option>
                    {candidaturesWithRent.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.showroom?.name ?? 'Boutique'} · {c.option?.rent != null ? `${c.option.rent} €` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Montant que recevra la boutique (€)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={createRentAmount}
                    onChange={(e) => setCreateRentAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
                  />
                  <p className="text-xs text-neutral-500 mt-1">Frais de service (2 %) au moment du paiement pour soutenir la plateforme (ex. 300€ → vous payez 306€, la boutique reçoit 300€).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Motif du paiement</label>
                  <input
                    type="text"
                    value={createRentMotif}
                    onChange={(e) => setCreateRentMotif(e.target.value)}
                    placeholder="Ex. Loyer mois de janvier"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm placeholder:text-neutral-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Pièce jointe (optionnel)</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                    onChange={(e) => setCreateRentFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-neutral-600 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border file:border-neutral-200 file:bg-neutral-50"
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCreateRent(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium">
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!createRentCandidatureId || !createRentAmount.trim() || submitting}
                  onClick={handleCreateRentPayment}
                  className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Envoyer la demande
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal unifié : Demander un paiement (je paie ou je demande à être payé) */}
      {showSendPayment && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setShowSendPayment(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Demander un paiement</h3>
                <button type="button" onClick={() => setShowSendPayment(false)} className="p-2 rounded-lg hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {requestAsPayer === null ? (
                <>
                  <p className="text-sm text-neutral-800 mb-5">La contrepartie recevra le montant indiqué. Des frais de service s&apos;ajoutent au moment du paiement pour soutenir la plateforme (à la charge de celui qui paie).</p>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => setRequestAsPayer(true)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-300 bg-white text-left font-semibold text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50 transition-colors"
                    >
                      Je paie la contrepartie
                    </button>
                    <button
                      type="button"
                      onClick={() => setRequestAsPayer(false)}
                      className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-300 bg-white text-left font-semibold text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50 transition-colors"
                    >
                      Je demande à être payé par la contrepartie
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-800 mb-5">
                    {requestAsPayer
                      ? 'Montant que recevra la contrepartie. Des frais de service s\'ajoutent au moment du paiement pour soutenir la plateforme. Si la contrepartie accepte, le paiement est enclenché.'
                      : 'Montant que vous recevrez. Des frais de service s\'ajoutent au moment du paiement pour soutenir la plateforme. Ici vous créez la demande.'}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">Accord / deal</label>
                      {!showManualCounterpart ? (
                        <>
                          <select
                            value={sendPaymentDealId ?? ''}
                            onChange={(e) => { setSendPaymentDealId(e.target.value || null); setManualCounterpartId(null); setNoDealWarning(false); }}
                            className="w-full px-3 py-2.5 rounded-lg border-2 border-neutral-300 bg-white text-neutral-900 text-sm focus:border-neutral-900 focus:outline-none focus:ring-0"
                          >
                            <option value="">Choisir…</option>
                            {asBrand && requestAsPayer && acceptedCandidaturesAll.map((c) => (
                              <option key={c.id} value={c.id}>{c.showroom?.name ?? 'Boutique'}</option>
                            ))}
                            {asBrand && !requestAsPayer && brandPlacements.map((p) => (
                              <option key={p.id} value={p.id}>{p.product?.product_name ?? 'Produit'} · {p.showroom?.name ?? ''}</option>
                            ))}
                            {!asBrand && requestAsPayer && activePlacements.map((p) => (
                              <option key={p.id} value={p.id}>{(p.product as { brand?: { brand_name?: string } })?.brand?.brand_name ?? 'Marque'} · {p.product?.product_name ?? 'Produit'}</option>
                            ))}
                            {!asBrand && !requestAsPayer && showroomCandidaturesWithRent.map((c) => (
                              <option key={c.id} value={c.id}>{c.brand?.brand_name ?? 'Marque'}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => { setShowManualCounterpart(true); setSendPaymentDealId(null); setManualCounterpartId(null); setNoDealWarning(false); }}
                            className="mt-2 text-sm font-medium text-neutral-800 hover:text-neutral-900 underline underline-offset-2"
                          >
                            {!asBrand ? 'Choisir une marque sur la plateforme' : 'Choisir une boutique sur la plateforme'}
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-neutral-900">
                            {!asBrand ? 'Rechercher une marque' : 'Rechercher une boutique'}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualSearch}
                              onChange={(e) => setManualSearch(e.target.value)}
                              placeholder={!asBrand ? 'Ex. Mellow, Nom de marque…' : 'Ex. Nom de la boutique…'}
                              className="flex-1 px-3 py-2.5 rounded-lg border-2 border-neutral-300 bg-white text-neutral-900 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-0"
                              autoFocus
                            />
                            <button type="button" onClick={() => { setShowManualCounterpart(false); setManualCounterpartId(null); setManualSearch(''); setNoDealWarning(false); setSendPaymentDealId(null); }} className="px-3 py-2.5 rounded-lg border-2 border-neutral-300 bg-white text-neutral-800 text-sm font-medium hover:bg-neutral-50 shrink-0">
                              Retour
                            </button>
                          </div>
                          {loadingManual ? (
                            <p className="text-sm text-neutral-700 py-4">Chargement…</p>
                          ) : !asBrand ? (
                            <div className="rounded-xl border-2 border-neutral-300 bg-white overflow-hidden min-h-[120px] max-h-52 overflow-y-auto">
                              {manualBrandsList.length === 0 ? (
                                <p className="px-4 py-6 text-sm text-neutral-700 text-center">Aucune marque trouvée. Essayez un autre nom.</p>
                              ) : (
                                <ul className="divide-y divide-neutral-200" role="listbox" aria-label="Marques">
                                  {manualBrandsList.map((b) => (
                                    <li key={b.id}>
                                      <button
                                        type="button"
                                        role="option"
                                        aria-selected={manualCounterpartId === b.id}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualCounterpartId(b.id); }}
                                        className={`w-full px-4 py-3 text-left text-sm font-medium cursor-pointer transition-colors ${manualCounterpartId === b.id ? 'bg-neutral-900 text-white' : 'text-neutral-900 bg-white hover:bg-neutral-100'}`}
                                      >
                                        {b.brand_name}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : asBrand ? (
                            <div className="rounded-xl border-2 border-neutral-300 bg-white overflow-hidden min-h-[120px] max-h-52 overflow-y-auto">
                              {manualShowroomsList.length === 0 ? (
                                <p className="px-4 py-6 text-sm text-neutral-700 text-center">Aucune boutique trouvée. Vérifiez le nom ou essayez sans filtre.</p>
                              ) : (
                                <ul className="divide-y divide-neutral-200" role="listbox" aria-label="Boutiques">
                                  {manualShowroomsList.map((s) => (
                                    <li key={s.id}>
                                      <button
                                        type="button"
                                        role="option"
                                        aria-selected={manualCounterpartId === s.id}
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualCounterpartId(s.id); }}
                                        className={`w-full px-4 py-3 text-left text-sm font-medium cursor-pointer transition-colors ${manualCounterpartId === s.id ? 'bg-neutral-900 text-white' : 'text-neutral-900 bg-white hover:bg-neutral-100'}`}
                                      >
                                        {s.name ?? 'Boutique'}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : null}
                          {noDealWarning && (
                            <p className="text-sm text-amber-800 bg-amber-100 border-2 border-amber-300 rounded-lg px-4 py-3 flex items-center gap-2 font-medium">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              Attention : vous n&apos;avez aucun deal validé avec cette contrepartie.
                            </p>
                          )}
                          {!asBrand && requestAsPayer && manualPlacements.length > 0 && (
                            <div>
                              <label className="block text-sm font-semibold text-neutral-900 mb-1.5">Choisir le placement</label>
                              <select
                                value={sendPaymentDealId ?? ''}
                                onChange={(e) => setSendPaymentDealId(e.target.value || null)}
                                className="w-full px-3 py-2.5 rounded-lg border-2 border-neutral-300 bg-white text-neutral-900 text-sm focus:border-neutral-900 focus:outline-none"
                              >
                                <option value="">Choisir…</option>
                                {manualPlacements.map((p) => (
                                  <option key={p.id} value={p.id}>{p.product?.product_name ?? 'Produit'}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          {asBrand && !requestAsPayer && manualPlacements.length > 0 && (
                            <div>
                              <label className="block text-sm font-semibold text-neutral-900 mb-1.5">Choisir le placement</label>
                              <select
                                value={sendPaymentDealId ?? ''}
                                onChange={(e) => setSendPaymentDealId(e.target.value || null)}
                                className="w-full px-3 py-2.5 rounded-lg border-2 border-neutral-300 bg-white text-neutral-900 text-sm focus:border-neutral-900 focus:outline-none"
                              >
                                <option value="">Choisir…</option>
                                {manualPlacements.map((p) => (
                                  <option key={p.id} value={p.id}>{p.product?.product_name ?? 'Produit'}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
                        {requestAsPayer ? 'Montant que recevra la contrepartie (€)' : 'Montant que vous recevrez (€)'}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={sendPaymentAmount}
                        onChange={(e) => setSendPaymentAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2.5 rounded-lg border-2 border-neutral-300 bg-white text-neutral-900 text-sm placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-0"
                      />
                      {requestAsPayer && sendPaymentAmount.trim() && (() => {
                        const a = Math.round(parseFloat(sendPaymentAmount.replace(',', '.')) * 100);
                        if (Number.isNaN(a) || a <= 0) return null;
                        const fee = Math.ceil(a * (PLATFORM_FEE_PERCENT / 100));
                        return <p className="text-xs text-neutral-700 mt-1">Vous paierez {formatAmount(a + fee)} (dont {formatAmount(fee)} de frais de service pour soutenir la plateforme).</p>;
                      })()}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">Motif du paiement</label>
                      <input
                        type="text"
                        value={sendPaymentMotif}
                        onChange={(e) => setSendPaymentMotif(e.target.value)}
                        placeholder="Ex. Règlement ventes janvier, Loyer…"
                        className="w-full px-3 py-2.5 rounded-lg border-2 border-neutral-300 bg-white text-neutral-900 text-sm placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">Pièce jointe (optionnel)</label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                        onChange={(e) => setSendPaymentFile(e.target.files?.[0] ?? null)}
                        className="w-full text-sm text-neutral-800 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-2 file:border-neutral-300 file:bg-white file:text-neutral-900 file:font-medium"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-end">
                    <button type="button" onClick={() => setRequestAsPayer(null)} className="px-4 py-2.5 rounded-lg border-2 border-neutral-300 text-neutral-800 font-medium order-2 sm:order-1">Retour</button>
                    <button type="button" onClick={() => setShowSendPayment(false)} className="px-4 py-2.5 rounded-lg border-2 border-neutral-300 text-neutral-800 font-medium order-3 sm:order-2">Annuler</button>
                    <button
                      type="button"
                      disabled={!(sendPaymentDealId || (!asBrand && requestAsPayer === false && noDealWarning && manualCounterpartId)) || !sendPaymentAmount.trim() || submitting}
                      onClick={handleSendPayment}
                      className="px-5 py-3 rounded-xl bg-neutral-900 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-3 hover:bg-neutral-800 transition-colors"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Demander le paiement
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal : contester (marque) */}
      {actionRequest && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setActionRequest(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900">Contester le paiement</h3>
                <button type="button" onClick={() => setActionRequest(null)} className="p-2 rounded-lg hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-600 mb-4">Indiquez pourquoi vous contestez cette demande de paiement. La boutique pourra en tenir compte.</p>
              <textarea
                value={contestNote}
                onChange={(e) => setContestNote(e.target.value)}
                placeholder="Votre motif de contestation…"
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm placeholder:text-neutral-400"
              />
              <div className="mt-6 flex gap-2 justify-end">
                <button type="button" onClick={() => setActionRequest(null)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium">
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!contestNote.trim() || submitting}
                  onClick={() => handleContestPayment(actionRequest.id)}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Envoyer la contestation
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
