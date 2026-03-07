'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/lib/supabase';
import type { ShowroomCommissionOption } from '@/lib/supabase';
import { SiretField } from '@/app/admin/components/SiretField';
import { BoutiqueCard, type BoutiqueCardProps } from '@/app/admin/components/cards/BoutiqueCard';
import { getAnnoncePath } from '@/lib/annonce';
import { Loader2, ChevronRight, Send, CheckCircle, Pencil, PlusCircle, Package } from 'lucide-react';

export type PublicListingData = {
  listing: {
    id: number;
    showroom_id: number;
    title: string;
    partnership_start_date: string | null;
    partnership_end_date: string | null;
    application_open_date: string | null;
    application_close_date: string | null;
  };
  showroom: {
    id: number;
    name: string;
    city: string | null;
    description: string | null;
    avatar_url: string | null;
    image_url: string | null;
    instagram_handle: string | null;
    shop_type: string | null;
    start_date: string | null;
    end_date: string | null;
  };
  commissionOptions: Array<{
    id: number;
    sort_order: number;
    rent: number | null;
    rent_period: string | null;
    commission_percent: number | null;
    description: string | null;
  }>;
};

function rentPeriodLabel(period: string | null): string {
  if (period === 'week') return '/sem.';
  if (period === 'one_off') return ' unique';
  return '/mois';
}

type Step = 'landing' | 'login_required' | 'signup_required' | 'choose_marque' | 'create_marque' | 'signup_to_send' | 'profile_siret' | 'profile_full' | 'profile_catalogue' | 'send' | 'submitting';

type BrandOption = {
  id: number;
  brand_name: string;
  siret: string | null;
  company_name: string | null;
  description?: string | null;
};

type PendingNewBrandData = {
  brand_name: string;
  siret: string;
  company_name: string;
  legal_status: string;
  legal_status_other: string;
  registered_address: string;
  representative_name: string;
  email: string;
  phone: string;
  description: string;
  instagram_handle: string;
  website_url: string;
};

const LEGAL_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'sarl', label: 'SARL' },
  { value: 'sas', label: 'SAS' },
  { value: 'sasu', label: 'SASU' },
  { value: 'sa', label: 'SA' },
  { value: 'eurl', label: 'EURL' },
  { value: 'ei', label: 'EI (Entreprise individuelle)' },
  { value: 'microentrepreneur', label: 'Micro-entrepreneur' },
  { value: 'association', label: 'Association' },
  { value: 'other', label: 'Autre' },
];

export function AnnonceMultiStepForm({ data, listingId }: { data: PublicListingData; listingId: number }) {
  const router = useRouter();
  const annoncePath = getAnnoncePath(data.showroom.name, listingId);
  const { listing, showroom, commissionOptions } = data;
  const optionsWithContent = commissionOptions.filter(
    (o) => (o.rent != null && o.rent > 0) || (o.commission_percent != null && o.commission_percent > 0) || (o.description?.trim() ?? '')
  );
  const commissionOptionsForCard: ShowroomCommissionOption[] = useMemo(() => (
    optionsWithContent.map((o) => ({
      ...o,
      showroom_id: showroom.id,
      rent_period: (o.rent_period === 'week' || o.rent_period === 'month' || o.rent_period === 'one_off' ? o.rent_period : null) as ShowroomCommissionOption['rent_period'],
    }))
  ), [optionsWithContent, showroom.id]);
  const showroomForCard = useMemo((): BoutiqueCardProps['showroom'] => ({
    ...showroom,
    shop_type: (showroom.shop_type === 'ephemeral' || showroom.shop_type === 'permanent' ? showroom.shop_type : null) as 'permanent' | 'ephemeral' | null,
    is_permanent: showroom.shop_type !== 'ephemeral',
    candidature_open_from: null as string | null,
    candidature_open_to: null as string | null,
  }), [showroom]);
  const listingDatesForCard = useMemo(() => ({
    partnership_start_date: listing.partnership_start_date,
    partnership_end_date: listing.partnership_end_date,
    application_open_date: listing.application_open_date,
    application_close_date: listing.application_close_date,
  }), [listing.partnership_start_date, listing.partnership_end_date, listing.application_open_date, listing.application_close_date]);
  const urgencyDaysForCard = useMemo(() => {
    const close = listing.application_close_date;
    if (!close?.trim()) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const closeDate = new Date(close);
    closeDate.setHours(0, 0, 0, 0);
    const diff = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff < 0 ? null : diff;
  }, [listing.application_close_date]);

  const [step, setStep] = useState<Step>('landing');
  const [transitionDir, setTransitionDir] = useState<'in' | 'out'>('in');
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [brandsList, setBrandsList] = useState<BrandOption[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [brand, setBrand] = useState<BrandOption | null>(null);
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [siretValue, setSiretValue] = useState('');
  const [companyNameFromSiret, setCompanyNameFromSiret] = useState<string | null>(null);
  const [siretVerified, setSiretVerified] = useState(false);
  const [savingSiret, setSavingSiret] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [isNegotiation, setIsNegotiation] = useState(false);
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [motivationMessage, setMotivationMessage] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandSiret, setNewBrandSiret] = useState('');
  const [newBrandCompanyName, setNewBrandCompanyName] = useState('');
  const [newBrandSiretVerified, setNewBrandSiretVerified] = useState(false);
  const [newBrandLegalStatus, setNewBrandLegalStatus] = useState('');
  const [newBrandRegisteredAddress, setNewBrandRegisteredAddress] = useState('');
  const [newBrandRepresentativeName, setNewBrandRepresentativeName] = useState('');
  const [newBrandEmail, setNewBrandEmail] = useState('');
  const [newBrandPhone, setNewBrandPhone] = useState('');
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [createBrandError, setCreateBrandError] = useState<string | null>(null);
  const [newBrandDescription, setNewBrandDescription] = useState('');
  const [newBrandLegalStatusOther, setNewBrandLegalStatusOther] = useState('');
  const [newBrandInstagram, setNewBrandInstagram] = useState('');
  const [newBrandWebsite, setNewBrandWebsite] = useState('');
  const pendingNewBrandRef = useRef<PendingNewBrandData | null>(null);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandDescription, setEditBrandDescription] = useState('');
  const [editSiret, setEditSiret] = useState('');
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editSiretVerified, setEditSiretVerified] = useState(false);
  const [editLegalStatus, setEditLegalStatus] = useState('');
  const [editLegalStatusOther, setEditLegalStatusOther] = useState('');
  const [editRegisteredAddress, setEditRegisteredAddress] = useState('');
  const [editRepresentativeName, setEditRepresentativeName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileSaving, setEditProfileSaving] = useState(false);
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [productsListLoading, setProductsListLoading] = useState(false);

  const profileComplete = Boolean(
    brand && (brand.siret?.trim() ?? '').length >= 14 && (brand.company_name?.trim() ?? '').length > 0 && productsCount >= 1
  );
  const canSend =
    profileComplete &&
    (optionsWithContent.length > 0
      ? (selectedOptionId != null && !isNegotiation) || (isNegotiation && negotiationMessage.trim().length > 0)
      : negotiationMessage.trim().length > 0);

  const checkAuthAndProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u ? { id: u.id } : null);
    if (!u) {
      setLoading(false);
      return;
    }
    const { data: brands } = await supabase.from('brands').select('id, brand_name, siret, company_name, description').eq('owner_id', u.id).order('brand_name');
    const list = (brands ?? []) as BrandOption[];
    setBrandsList(list);
    if (list.length === 0) {
      setBrand(null);
      setSelectedBrandId(null);
      setLoading(false);
      return;
    }
    const first = list[0];
    setSelectedBrandId(first.id);
    setBrand(first);
    setSiretValue((first.siret ?? '').trim());
    if ((first.siret ?? '').trim().length === 14) setCompanyNameFromSiret(first.company_name ?? null);
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', first.id);
    setProductsCount(count ?? 0);
    setLoading(false);
  }, []);

  const loadProfileForBrand = useCallback(async (brandId: number) => {
    const b = brandsList.find((x) => x.id === brandId) ?? null;
    setBrand(b);
    if (b) {
      setSiretValue((b.siret ?? '').trim());
      setCompanyNameFromSiret((b.siret ?? '').trim().length === 14 ? (b.company_name ?? null) : null);
      setSiretVerified((b.siret ?? '').trim().length === 14 && (b.company_name ?? '').trim().length > 0);
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', brandId);
      setProductsCount(count ?? 0);
    }
  }, [brandsList]);

  useEffect(() => {
    checkAuthAndProfile();
  }, [checkAuthAndProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAuthAndProfile();
    });
    return () => subscription.unsubscribe();
  }, [checkAuthAndProfile]);

  const goToStep = (next: Step) => {
    setTransitionDir('out');
    setTimeout(() => {
      setStep(next);
      setTransitionDir('in');
    }, 220);
  };

  const handleCandidaterClick = () => {
    if (!user) {
      setStep('choose_marque');
      return;
    }
    if (brandsList.length === 0) {
      setStep('signup_required');
      return;
    }
    setStep('choose_marque');
  };

  const handleChooseMarqueContinue = async () => {
    if (selectedBrandId == null) return;
    await loadProfileForBrand(selectedBrandId);
    const b = brandsList.find((x) => x.id === selectedBrandId);
    if (!b) return;
    const siretOk = (b.siret ?? '').trim().length >= 14 && (b.company_name ?? '').trim().length > 0;
    if (!siretOk) {
      goToStep('profile_siret');
      return;
    }
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', selectedBrandId);
    const hasProducts = (count ?? 0) >= 1;
    if (!hasProducts) {
      goToStep('profile_catalogue');
      return;
    }
    goToStep('send');
  };

  const handleCreateNewBrandSubmit = async () => {
    const siretClean = newBrandSiret.replace(/\D/g, '');
    if (siretClean.length !== 14 || !/^\d{14}$/.test(siretClean)) {
      setCreateBrandError('Le SIRET doit comporter exactement 14 chiffres et être vérifié.');
      return;
    }
    if (!newBrandSiretVerified || !newBrandCompanyName?.trim()) {
      setCreateBrandError('Vérifiez votre SIRET avec le bouton de validation avant de continuer.');
      return;
    }
    const name = newBrandName.trim();
    if (!name) {
      setCreateBrandError('Le nom de la marque est obligatoire.');
      return;
    }
    if (!newBrandLegalStatus) {
      setCreateBrandError('Le statut juridique est obligatoire.');
      return;
    }
    if (!newBrandRegisteredAddress?.trim()) {
      setCreateBrandError('L\'adresse du siège est obligatoire.');
      return;
    }
    if (!newBrandRepresentativeName?.trim()) {
      setCreateBrandError('Le nom du représentant est obligatoire.');
      return;
    }
    if (!newBrandEmail?.trim()) {
      setCreateBrandError("L'email de contact est obligatoire.");
      return;
    }
    if (!newBrandDescription?.trim()) {
      setCreateBrandError('La description de la marque est obligatoire.');
      return;
    }
    if (!newBrandInstagram?.trim()) {
      setCreateBrandError('Le compte Instagram est obligatoire.');
      return;
    }
    if (!newBrandWebsite?.trim()) {
      setCreateBrandError('L\'URL du site web est obligatoire.');
      return;
    }
    setCreateBrandError(null);

    if (!user) {
      pendingNewBrandRef.current = {
        brand_name: name,
        siret: siretClean,
        company_name: newBrandCompanyName.trim(),
        legal_status: newBrandLegalStatus,
        legal_status_other: newBrandLegalStatusOther.trim(),
        registered_address: newBrandRegisteredAddress.trim(),
        representative_name: newBrandRepresentativeName.trim(),
        email: newBrandEmail.trim(),
        phone: newBrandPhone.trim(),
        description: newBrandDescription.trim(),
        instagram_handle: newBrandInstagram.trim().replace(/^@/, ''),
        website_url: newBrandWebsite.trim(),
      };
      goToStep('signup_to_send');
      return;
    }

    setCreatingBrand(true);
    try {
      const { data: newRow, error: err } = await supabase
        .from('brands')
        .insert({
          owner_id: user.id,
          brand_name: name,
          siret: siretClean,
          company_name: newBrandCompanyName.trim(),
          legal_status: newBrandLegalStatus,
          legal_status_other: newBrandLegalStatus === 'other' ? newBrandLegalStatusOther.trim() || null : null,
          registered_address: newBrandRegisteredAddress.trim(),
          representative_name: newBrandRepresentativeName.trim(),
          email: newBrandEmail.trim(),
          phone: newBrandPhone.trim() || null,
          description: newBrandDescription.trim(),
          instagram_handle: newBrandInstagram.trim().replace(/^@/, ''),
          website_url: newBrandWebsite.trim(),
          credits: 2,
        })
        .select('id, brand_name, siret, company_name, description')
        .single();
      if (err) {
        setCreateBrandError(err.code === '23505' ? 'Une marque avec ce nom existe déjà.' : err.message);
        return;
      }
      const newBrandOption: BrandOption = {
        id: newRow.id,
        brand_name: newRow.brand_name,
        siret: newRow.siret,
        company_name: newRow.company_name,
        description: newRow.description ?? null,
      };
      setBrandsList((prev) => [...prev, newBrandOption].sort((a, b) => (a.brand_name ?? '').localeCompare(b.brand_name ?? '')));
      setBrand(newBrandOption);
      setSelectedBrandId(newRow.id);
      setProductsCount(0);
      setSiretValue((newRow.siret ?? '').trim());
      setCompanyNameFromSiret(newRow.company_name ?? null);
      setSiretVerified(true);
      goToStep('profile_catalogue');
    } finally {
      setCreatingBrand(false);
    }
  };

  const handleSignupAndCreateBrand = async () => {
    const pending = pendingNewBrandRef.current;
    if (!pending || !signupEmail.trim() || signupPassword.length < 6) {
      setSignupError('Email et mot de passe (min. 6 caractères) sont requis.');
      return;
    }
    setSignupError(null);
    setSignupLoading(true);
    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: signupEmail.trim(),
        password: signupPassword,
        options: { emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}${annoncePath}` : undefined },
      });
      if (signUpErr) {
        setSignupError(signUpErr.message);
        return;
      }
      const newUserId = signUpData.user?.id;
      if (!newUserId) {
        setSignupError('Compte créé mais session introuvable. Connectez-vous puis revenez sur cette page.');
        return;
      }
      const { data: newRow, error: insertErr } = await supabase
        .from('brands')
        .insert({
          owner_id: newUserId,
          brand_name: pending.brand_name,
          siret: pending.siret,
          company_name: pending.company_name,
          legal_status: pending.legal_status,
          legal_status_other: pending.legal_status_other || null,
          registered_address: pending.registered_address,
          representative_name: pending.representative_name,
          email: pending.email,
          phone: pending.phone || null,
          description: pending.description,
          instagram_handle: pending.instagram_handle || null,
          website_url: pending.website_url || null,
          credits: 2,
        })
        .select('id, brand_name, siret, company_name, description')
        .single();
      if (insertErr) {
        setSignupError(insertErr.message);
        return;
      }
      pendingNewBrandRef.current = null;
      const newBrandOption: BrandOption = {
        id: newRow.id,
        brand_name: newRow.brand_name,
        siret: newRow.siret,
        company_name: newRow.company_name,
        description: newRow.description ?? (pending.description || null),
      };
      setBrandsList((prev) => [...prev, newBrandOption].sort((a, b) => (a.brand_name ?? '').localeCompare(b.brand_name ?? '')));
      setBrand(newBrandOption);
      setSelectedBrandId(newRow.id);
      setProductsCount(0);
      setUser({ id: newUserId });
      setSiretValue((newRow.siret ?? '').trim());
      setCompanyNameFromSiret(newRow.company_name ?? null);
      setSiretVerified(true);
      goToStep('profile_catalogue');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleSiretVerified = (result: { companyName?: string }) => {
    setCompanyNameFromSiret(result.companyName ?? null);
    setSiretVerified(true);
  };

  const saveSiretAndContinue = async () => {
    if (!brand || siretValue.replace(/\D/g, '').length !== 14 || !companyNameFromSiret?.trim()) return;
    setSavingSiret(true);
    try {
      await supabase
        .from('brands')
        .update({ siret: siretValue.replace(/\s/g, ''), company_name: companyNameFromSiret.trim() })
        .eq('id', brand.id);
      await checkAuthAndProfile();
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', brand.id);
      const hasProducts = (count ?? 0) >= 1;
      goToStep(hasProducts ? 'send' : 'profile_catalogue');
    } finally {
      setSavingSiret(false);
    }
  };

  const loadEditProfile = useCallback(async (brandId: number) => {
    setEditProfileLoading(true);
    setEditProfileError(null);
    try {
      const [brandRes, countRes] = await Promise.all([
        supabase
          .from('brands')
          .select('brand_name, description, siret, company_name, legal_status, legal_status_other, registered_address, representative_name, email, phone, instagram_handle, website_url')
          .eq('id', brandId)
          .single(),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', brandId),
      ]);
      const { data: row, error } = brandRes;
      if (error) {
        setEditProfileError(error.message);
        return;
      }
      if (row) {
        setEditBrandName((row.brand_name ?? '').trim());
        setEditBrandDescription((row.description ?? '').trim());
        setEditSiret((row.siret ?? '').trim());
        setEditCompanyName((row.company_name ?? '').trim());
        setEditSiretVerified(((row.siret ?? '').trim().length === 14 && (row.company_name ?? '').trim().length > 0));
        setEditLegalStatus((row.legal_status ?? '').trim());
        setEditLegalStatusOther((row.legal_status_other ?? '').trim());
        setEditRegisteredAddress((row.registered_address ?? '').trim());
        setEditRepresentativeName((row.representative_name ?? '').trim());
        setEditEmail((row.email ?? '').trim());
        setEditPhone((row.phone ?? '').trim());
        setEditInstagram((row.instagram_handle ?? '').trim());
        setEditWebsite((row.website_url ?? '').trim());
      }
      const { count } = countRes;
      setProductsCount(count ?? 0);
    } finally {
      setEditProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (step === 'profile_full' && brand?.id) {
      loadEditProfile(brand.id);
    }
  }, [step, brand?.id, loadEditProfile]);

  useEffect(() => {
    if ((step === 'profile_catalogue' || step === 'profile_full') && brand?.id) {
      let cancelled = false;
      setProductsListLoading(true);
      const req = supabase
        .from('products')
        .select('id, brand_id, product_name, price, description, image_url, commission_percent, stock_max, created_at')
        .eq('brand_id', brand.id)
        .order('created_at', { ascending: false });
      void Promise.resolve(req).then(({ data: d }) => {
        if (!cancelled) setProductsList((d as Product[]) ?? []);
      }).finally(() => {
        if (!cancelled) setProductsListLoading(false);
      });
      return () => { cancelled = true; };
    } else {
      setProductsList([]);
    }
  }, [step, brand?.id]);

  useEffect(() => {
    if (step === 'send' && brand?.description?.trim() && !motivationMessage.trim()) {
      setMotivationMessage(brand.description.trim());
    }
  }, [step, brand?.id, brand?.description]);

  const saveEditProfile = async () => {
    if (!brand) return;
    const siretClean = editSiret.replace(/\D/g, '');
    if (siretClean.length !== 14 || !/^\d{14}$/.test(siretClean)) {
      setEditProfileError('Le SIRET doit comporter exactement 14 chiffres.');
      return;
    }
    if (!editSiretVerified || !editCompanyName?.trim()) {
      setEditProfileError('Vérifiez votre SIRET avec le bouton de validation.');
      return;
    }
    if (!editBrandName.trim()) {
      setEditProfileError('Le nom de la marque est obligatoire.');
      return;
    }
    if (!editLegalStatus) {
      setEditProfileError('Le statut juridique est obligatoire.');
      return;
    }
    if (!editRegisteredAddress?.trim()) {
      setEditProfileError('L\'adresse du siège est obligatoire.');
      return;
    }
    if (!editRepresentativeName?.trim()) {
      setEditProfileError('Le nom du représentant est obligatoire.');
      return;
    }
    if (!editEmail?.trim()) {
      setEditProfileError('L\'email de contact est obligatoire.');
      return;
    }
    setEditProfileError(null);
    setEditProfileSaving(true);
    try {
      const { error } = await supabase
        .from('brands')
        .update({
          brand_name: editBrandName.trim(),
          description: editBrandDescription.trim() || null,
          siret: siretClean,
          company_name: editCompanyName.trim(),
          legal_status: editLegalStatus || null,
          legal_status_other: editLegalStatus === 'other' ? editLegalStatusOther.trim() || null : null,
          registered_address: editRegisteredAddress.trim() || null,
          representative_name: editRepresentativeName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim() || null,
          instagram_handle: editInstagram.trim().replace(/^@/, '') || null,
          website_url: editWebsite.trim() || null,
        })
        .eq('id', brand.id);
      if (error) {
        setEditProfileError(error.message);
        return;
      }
      await checkAuthAndProfile();
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', brand.id);
      setProductsCount(count ?? 0);
      setBrandsList((prev) => {
        const b = prev.find((x) => x.id === brand.id);
        if (b) {
          return prev.map((x) => (x.id === brand.id ? { ...x, brand_name: editBrandName.trim(), siret: siretClean, company_name: editCompanyName.trim() } : x));
        }
        return prev;
      });
      setBrand((prev) => (prev ? { ...prev, brand_name: editBrandName.trim(), siret: siretClean, company_name: editCompanyName.trim() } : null));
      setSiretValue(siretClean);
      setCompanyNameFromSiret(editCompanyName.trim());
      setSiretVerified(true);
      goToStep('send');
    } finally {
      setEditProfileSaving(false);
    }
  };

  const submitCandidature = async () => {
    if (!brand || !canSend) return;
    const { count: finalCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', brand.id);
    const hasProducts = (finalCount ?? 0) >= 1;
    const siretOk = (brand.siret ?? '').trim().length >= 14 && (brand.company_name ?? '').trim().length > 0;
    if (!siretOk || !hasProducts) {
      alert('Profil 100 % complété requis : SIRET vérifié, raison sociale et au moins un produit au catalogue.');
      return;
    }
    setStep('submitting');
    try {
      const metadata: Record<string, unknown> = { status: 'pending' };
      if (optionsWithContent.length === 0 && negotiationMessage.trim()) {
        metadata.negotiation_message = negotiationMessage.trim();
      } else if (selectedOptionId != null && !isNegotiation && optionsWithContent.length > 0) {
        const opt = optionsWithContent.find((o) => o.id === selectedOptionId);
        if (opt) {
          metadata.rent = opt.rent ?? undefined;
          metadata.rent_period = opt.rent_period ?? 'month';
          metadata.commission_percent = opt.commission_percent ?? undefined;
          if (opt.description?.trim()) metadata.option_description = opt.description;
        }
      } else if (isNegotiation) {
        metadata.negotiation_message = negotiationMessage.trim();
      }
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) {
        setStep('send');
        router.push(`/login?redirect=${encodeURIComponent(annoncePath)}`);
        return;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/candidatures/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          brandId: brand.id,
          showroomId: showroom.id,
          listingId: listing.id,
          metadata,
          motivationMessage: motivationMessage.trim() || '',
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStep('send');
        alert((json as { error?: string }).error ?? "Erreur lors de l'envoi. Réessayez.");
        return;
      }
      const conversationId = json.conversationId as string | undefined;
      router.push(`${annoncePath}/succes${conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ''}`);
    } catch (err) {
      setStep('send');
      const message = err instanceof Error && err.name === 'AbortError'
        ? 'La requête a expiré. Vérifiez votre connexion et réessayez.'
        : (err instanceof Error ? err.message : "Erreur réseau. Réessayez.");
      alert(message);
    }
  };

  const transitionClass = transitionDir === 'out' ? 'opacity-0 translate-x-3' : 'opacity-100 translate-x-0';
  const transitionDuration = 'duration-300 ease-out';

  if (loading && step === 'landing') {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pb-16">
      <div className={`transition-all ${transitionDuration} ${transitionClass}`}>
        {step === 'landing' && (
          <BoutiqueCard
            showroom={showroomForCard}
            commissionOptions={commissionOptionsForCard}
            listingTitle={listing.title}
            listingDates={listingDatesForCard}
            showReportButton={false}
            urgencyDays={urgencyDaysForCard}
          >
            <button
              type="button"
              onClick={handleCandidaterClick}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 transition-colors duration-150"
            >
              Candidater
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </BoutiqueCard>
        )}

        {step === 'login_required' && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-neutral-700">Connectez-vous avec un compte marque pour candidater.</p>
            <Link
              href={`/login?redirect=${encodeURIComponent(annoncePath)}`}
              className="mt-4 inline-flex items-center gap-2 py-3 px-4 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150"
            >
              Se connecter
            </Link>
          </div>
        )}

        {step === 'signup_required' && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <p className="text-neutral-700">Vous devez avoir un profil Marque pour candidater à cette annonce.</p>
            <Link
              href="/signup?type=brand"
              className="mt-4 inline-flex items-center gap-2 py-3 px-4 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150"
            >
              Créer un compte marque
            </Link>
          </div>
        )}

        {step === 'choose_marque' && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-semibold text-lg text-neutral-900">Avec quelle marque candidatez-vous ?</h2>
            {user ? (
              <>
                <p className="text-sm text-neutral-500 mt-0.5">Choisissez une marque existante ou créez une nouvelle marque pour cette candidature.</p>
                <ul className="mt-5 space-y-2">
                  {brandsList.map((b) => (
                    <li key={b.id}>
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedBrandId === b.id ? 'border-neutral-900 bg-neutral-50' : 'border-black/[0.08] hover:bg-neutral-50/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="marque"
                          checked={selectedBrandId === b.id}
                          onChange={() => setSelectedBrandId(b.id)}
                          className="mt-1 rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <span className="text-sm font-medium text-neutral-900">{b.brand_name || `Marque #${b.id}`}</span>
                      </label>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={() => goToStep('create_marque')}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border border-dashed border-black/[0.2] hover:bg-neutral-50/50 hover:border-neutral-400 transition-colors text-left"
                    >
                      <PlusCircle className="h-5 w-5 text-neutral-500 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-neutral-700">Créer une nouvelle marque pour candidater</span>
                    </button>
                  </li>
                </ul>
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={() => goToStep('landing')}
                    className="py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors duration-150"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={handleChooseMarqueContinue}
                    disabled={selectedBrandId == null}
                    className="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors duration-150"
                  >
                    Continuer
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-500 mt-0.5">Renseignez les informations de votre marque, puis créez votre compte pour envoyer votre candidature.</p>
                <ul className="mt-5 space-y-2">
                  <li>
                    <button
                      type="button"
                      onClick={() => goToStep('create_marque')}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border border-neutral-900 bg-neutral-50 hover:bg-neutral-100 transition-colors text-left"
                    >
                      <PlusCircle className="h-5 w-5 text-neutral-700 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span className="text-sm font-medium text-neutral-900">Créer une nouvelle marque et candidater</span>
                    </button>
                  </li>
                </ul>
                <p className="mt-5 text-center text-sm text-neutral-600">
                  Vous avez déjà un compte ?{' '}
                  <Link
                    href={`/login?redirect=${encodeURIComponent(annoncePath)}`}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    Se connecter
                  </Link>
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => goToStep('landing')}
                    className="py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors duration-150"
                  >
                    Retour
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'create_marque' && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-semibold text-lg text-neutral-900">Profil de votre marque</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Renseignez toutes les informations de votre profil marque. Ensuite vous créerez votre compte puis ajouterez votre catalogue.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="new-brand-name" className="block text-sm font-medium text-neutral-700 mb-1">Nom de la marque *</label>
                <input
                  id="new-brand-name"
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="Ex. Ma Marque"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
              <div>
                <label htmlFor="new-brand-desc" className="block text-sm font-medium text-neutral-700 mb-1">Description *</label>
                <textarea
                  id="new-brand-desc"
                  value={newBrandDescription}
                  onChange={(e) => setNewBrandDescription(e.target.value)}
                  placeholder="Présentez votre marque"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none"
                />
              </div>
              <div>
                <label htmlFor="new-brand-siret" className="block text-sm font-medium text-neutral-700 mb-1">SIRET *</label>
                <SiretField
                  id="new-brand-siret"
                  value={newBrandSiret}
                  onChange={setNewBrandSiret}
                  onVerified={(r) => {
                    setNewBrandCompanyName(r.companyName ?? '');
                    setNewBrandSiretVerified(true);
                  }}
                  onValidationChange={setNewBrandSiretVerified}
                  requiredVerification={true}
                />
              </div>
              {newBrandCompanyName && (
                <p className="text-sm text-emerald-700 font-medium">Raison sociale : {newBrandCompanyName}</p>
              )}
              <div>
                <label htmlFor="new-brand-company" className="block text-sm font-medium text-neutral-700 mb-1">Raison sociale *</label>
                <input
                  id="new-brand-company"
                  type="text"
                  value={newBrandCompanyName}
                  onChange={(e) => setNewBrandCompanyName(e.target.value)}
                  placeholder="Nom de l'entreprise (SIRET)"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
              <div>
                <label htmlFor="new-brand-legal" className="block text-sm font-medium text-neutral-700 mb-1">Statut juridique *</label>
                <select
                  id="new-brand-legal"
                  value={newBrandLegalStatus}
                  onChange={(e) => setNewBrandLegalStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                >
                  <option value="">Sélectionnez</option>
                  {LEGAL_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {newBrandLegalStatus === 'other' && (
                  <input
                    type="text"
                    value={newBrandLegalStatusOther}
                    onChange={(e) => setNewBrandLegalStatusOther(e.target.value)}
                    placeholder="Précisez le statut juridique"
                    className="mt-2 w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                )}
              </div>
              <div>
                <label htmlFor="new-brand-address" className="block text-sm font-medium text-neutral-700 mb-1">Adresse du siège *</label>
                <input
                  id="new-brand-address"
                  type="text"
                  value={newBrandRegisteredAddress}
                  onChange={(e) => setNewBrandRegisteredAddress(e.target.value)}
                  placeholder="Adresse complète du siège social"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
              <div>
                <label htmlFor="new-brand-rep" className="block text-sm font-medium text-neutral-700 mb-1">Nom du représentant *</label>
                <input
                  id="new-brand-rep"
                  type="text"
                  value={newBrandRepresentativeName}
                  onChange={(e) => setNewBrandRepresentativeName(e.target.value)}
                  placeholder="Nom et prénom"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
              <div>
                <label htmlFor="new-brand-email" className="block text-sm font-medium text-neutral-700 mb-1">Email de contact *</label>
                <input
                  id="new-brand-email"
                  type="email"
                  value={newBrandEmail}
                  onChange={(e) => setNewBrandEmail(e.target.value)}
                  placeholder="contact@marque.fr"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
              <div>
                <label htmlFor="new-brand-phone" className="block text-sm font-medium text-neutral-700 mb-1">Téléphone</label>
                <input
                  id="new-brand-phone"
                  type="tel"
                  value={newBrandPhone}
                  onChange={(e) => setNewBrandPhone(e.target.value)}
                  placeholder="Optionnel"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
              <div>
                <label htmlFor="new-brand-instagram" className="block text-sm font-medium text-neutral-700 mb-1">Instagram *</label>
                <input
                  id="new-brand-instagram"
                  type="text"
                  value={newBrandInstagram}
                  onChange={(e) => setNewBrandInstagram(e.target.value)}
                  placeholder="mamarque (sans @)"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
              <div>
                <label htmlFor="new-brand-website" className="block text-sm font-medium text-neutral-700 mb-1">Site web *</label>
                <input
                  id="new-brand-website"
                  type="url"
                  value={newBrandWebsite}
                  onChange={(e) => setNewBrandWebsite(e.target.value)}
                  placeholder="https://www.mamarque.fr"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
            </div>
            {createBrandError && <p className="mt-3 text-sm text-red-600">{createBrandError}</p>}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => goToStep('choose_marque')}
                className="py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors duration-150"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleCreateNewBrandSubmit}
                disabled={
                  !newBrandName.trim() ||
                  !newBrandSiretVerified ||
                  !newBrandCompanyName?.trim() ||
                  !newBrandLegalStatus ||
                  !newBrandRegisteredAddress?.trim() ||
                  !newBrandRepresentativeName?.trim() ||
                  !newBrandEmail?.trim() ||
                  !newBrandDescription?.trim() ||
                  !newBrandInstagram?.trim() ||
                  !newBrandWebsite?.trim() ||
                  creatingBrand
                }
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors duration-150"
              >
                {creatingBrand ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {user ? 'Créer la marque et continuer' : 'Continuer (créer mon compte à l\'étape suivante)'}
              </button>
            </div>
          </div>
        )}

        {step === 'signup_to_send' && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-semibold text-lg text-neutral-900">Créer votre compte</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Vos informations marque sont enregistrées. Choisissez un email et un mot de passe pour créer votre compte.
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-neutral-700 mb-1">Email *</label>
                <input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-neutral-700 mb-1">Mot de passe * (min. 6 caractères)</label>
                <input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                />
              </div>
            </div>
            {signupError && <p className="mt-3 text-sm text-red-600">{signupError}</p>}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => goToStep('create_marque')}
                className="py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors duration-150"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleSignupAndCreateBrand}
                disabled={!signupEmail.trim() || signupPassword.length < 6 || signupLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors duration-150"
              >
                {signupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Créer mon compte et continuer
              </button>
            </div>
          </div>
        )}

        {step === 'profile_siret' && brand && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-semibold text-lg text-neutral-900">Complétez votre profil</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Marque : <strong>{brand.brand_name || `Marque #${brand.id}`}</strong>. Vérifiez votre SIRET pour continuer.
            </p>
            <div className="mt-5">
              <label htmlFor="annonce-siret" className="block text-sm font-medium text-neutral-700 mb-1">SIRET</label>
              <SiretField
                id="annonce-siret"
                value={siretValue}
                onChange={setSiretValue}
                onVerified={handleSiretVerified}
                onValidationChange={setSiretVerified}
                requiredVerification={true}
              />
              {companyNameFromSiret && (
                <p className="mt-2 text-sm text-emerald-700 font-medium">Entreprise : {companyNameFromSiret}</p>
              )}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => goToStep('landing')}
                className="py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors duration-150"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={saveSiretAndContinue}
                disabled={!siretVerified || !companyNameFromSiret?.trim() || savingSiret}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors duration-150"
              >
                {savingSiret ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continuer
              </button>
            </div>
          </div>
        )}

        {step === 'profile_full' && brand && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-semibold text-lg text-neutral-900">Re-vérifier tout le profil marque</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Modifiez les informations de votre marque si besoin. Vous pouvez aussi ajouter des produits au catalogue ci-dessous.
            </p>
            {editProfileLoading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={1.5} />
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="edit-brand-name" className="block text-sm font-medium text-neutral-700 mb-1">Nom de la marque *</label>
                  <input
                    id="edit-brand-name"
                    type="text"
                    value={editBrandName}
                    onChange={(e) => setEditBrandName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-brand-desc" className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                  <textarea
                    id="edit-brand-desc"
                    value={editBrandDescription}
                    onChange={(e) => setEditBrandDescription(e.target.value)}
                    placeholder="Présentez votre marque"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none"
                  />
                </div>
                <div>
                  <label htmlFor="edit-brand-siret" className="block text-sm font-medium text-neutral-700 mb-1">SIRET *</label>
                  <SiretField
                    id="edit-brand-siret"
                    value={editSiret}
                    onChange={setEditSiret}
                    onVerified={(r) => {
                      setEditCompanyName(r.companyName ?? '');
                      setEditSiretVerified(true);
                    }}
                    onValidationChange={setEditSiretVerified}
                    requiredVerification={true}
                  />
                </div>
                {editCompanyName && (
                  <p className="text-sm text-emerald-700 font-medium">Raison sociale : {editCompanyName}</p>
                )}
                <div>
                  <label htmlFor="edit-brand-company" className="block text-sm font-medium text-neutral-700 mb-1">Raison sociale *</label>
                  <input
                    id="edit-brand-company"
                    type="text"
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-brand-legal" className="block text-sm font-medium text-neutral-700 mb-1">Statut juridique *</label>
                  <select
                    id="edit-brand-legal"
                    value={editLegalStatus}
                    onChange={(e) => setEditLegalStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  >
                    <option value="">Sélectionnez</option>
                    {LEGAL_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {editLegalStatus === 'other' && (
                    <input
                      type="text"
                      value={editLegalStatusOther}
                      onChange={(e) => setEditLegalStatusOther(e.target.value)}
                      placeholder="Précisez le statut juridique"
                      className="mt-2 w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="edit-brand-address" className="block text-sm font-medium text-neutral-700 mb-1">Adresse du siège *</label>
                  <input
                    id="edit-brand-address"
                    type="text"
                    value={editRegisteredAddress}
                    onChange={(e) => setEditRegisteredAddress(e.target.value)}
                    placeholder="Adresse complète du siège social"
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-brand-rep" className="block text-sm font-medium text-neutral-700 mb-1">Nom du représentant *</label>
                  <input
                    id="edit-brand-rep"
                    type="text"
                    value={editRepresentativeName}
                    onChange={(e) => setEditRepresentativeName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-brand-email" className="block text-sm font-medium text-neutral-700 mb-1">Email de contact *</label>
                  <input
                    id="edit-brand-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-brand-phone" className="block text-sm font-medium text-neutral-700 mb-1">Téléphone</label>
                  <input
                    id="edit-brand-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-brand-instagram" className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
                  <input
                    id="edit-brand-instagram"
                    type="text"
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    placeholder="mamarque (sans @)"
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="edit-brand-website" className="block text-sm font-medium text-neutral-700 mb-1">Site web</label>
                  <input
                    id="edit-brand-website"
                    type="url"
                    value={editWebsite}
                    onChange={(e) => setEditWebsite(e.target.value)}
                    placeholder="https://www.mamarque.fr"
                    className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div className="pt-2 border-t border-black/[0.08]">
                  <p className="text-sm font-medium text-neutral-700 mb-1">Catalogue</p>
                  <p className="text-xs text-neutral-500 mb-2">
                    {productsCount >= 1
                      ? `Vous avez ${productsCount} produit${productsCount > 1 ? 's' : ''} dans votre catalogue.`
                      : 'Ajoutez au moins un produit pour pouvoir envoyer votre candidature.'}
                  </p>
                  {productsListLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" strokeWidth={1.5} />
                    </div>
                  ) : productsList.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {productsList.map((p) => (
                        <div key={p.id} className="rounded-xl border border-black/[0.08] overflow-hidden bg-neutral-50/50">
                          <div className="aspect-square bg-neutral-100">
                            {p.image_url?.trim() ? (
                              <img src={p.image_url.trim()} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
                              </div>
                            )}
                          </div>
                          <div className="px-2 py-1.5">
                            <p className="text-xs font-medium text-neutral-900 line-clamp-1">{p.product_name}</p>
                            <p className="text-xs text-neutral-500">{Number(p.price).toFixed(2)} €</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <Link
                    href={`/admin/products/add?brand=${brand.id}&returnTo=${encodeURIComponent(annoncePath)}`}
                    className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    {productsCount >= 1 ? 'Ajouter un autre produit' : 'Ajouter un produit'}
                  </Link>
                </div>
              </div>
            )}
            {editProfileError && <p className="mt-3 text-sm text-red-600">{editProfileError}</p>}
            {!editProfileLoading && (
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => goToStep('send')}
                  className="py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors duration-150"
                >
                  Retour à l&apos;envoi
                </button>
                <button
                  type="button"
                  onClick={saveEditProfile}
                  disabled={
                    !editBrandName.trim() ||
                    !editSiretVerified ||
                    !editCompanyName?.trim() ||
                    !editLegalStatus ||
                    !editRegisteredAddress?.trim() ||
                    !editRepresentativeName?.trim() ||
                    !editEmail?.trim() ||
                    editProfileSaving
                  }
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors duration-150"
                >
                  {editProfileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Enregistrer les modifications
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'profile_catalogue' && brand && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-semibold text-lg text-neutral-900">Catalogue</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Marque : <strong>{brand.brand_name || `Marque #${brand.id}`}</strong>.
            </p>
            <p className="text-sm text-neutral-600 mt-1">
              Pour maximiser vos chances d&apos;être accepté par la boutique, ajoutez au moins un produit à votre catalogue.
            </p>
            <p className="text-sm text-neutral-500 mt-0.5">
              {productsCount >= 1
                ? `Vous avez ${productsCount} produit${productsCount > 1 ? 's' : ''} dans votre catalogue.`
                : 'Ajoutez au moins un produit pour pouvoir continuer et envoyer votre candidature.'}
            </p>
            {productsListLoading ? (
              <div className="mt-4 flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={1.5} />
              </div>
            ) : productsList.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-medium text-neutral-600 mb-2">Vos produits</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {productsList.map((p) => (
                    <div key={p.id} className="rounded-xl border border-black/[0.08] overflow-hidden bg-neutral-50/50">
                      <div className="aspect-square bg-neutral-100">
                        {p.image_url?.trim() ? (
                          <img src={p.image_url.trim()} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-10 w-10 text-neutral-300" strokeWidth={1.5} />
                          </div>
                        )}
                      </div>
                      <div className="px-2 py-2">
                        <p className="text-sm font-medium text-neutral-900 line-clamp-1">{p.product_name}</p>
                        <p className="text-xs text-neutral-500">{Number(p.price).toFixed(2)} €</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {productsCount >= 1 ? (
              <div className="mt-4 flex items-center gap-2 text-emerald-700">
                <CheckCircle className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-sm font-medium">Profil prêt</span>
              </div>
            ) : null}
            <div className="mt-4">
              <Link
                href={`/admin/products/add?brand=${brand.id}&returnTo=${encodeURIComponent(annoncePath)}`}
                className="inline-flex items-center gap-2 py-3 px-4 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150"
              >
                <PlusCircle className="h-4 w-4" strokeWidth={1.5} />
                {productsCount >= 1 ? 'Ajouter un autre produit' : 'Ajouter un produit'}
              </Link>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => goToStep('profile_full')}
                className="py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors duration-150"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={() => goToStep('send')}
                disabled={productsCount < 1}
                className="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {step === 'send' && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <h2 className="font-semibold text-lg text-neutral-900">Envoyer ma candidature</h2>
            {brand && (
              <p className="mt-1 text-sm font-medium text-neutral-700">
                Vous candidatez avec : <strong className="text-neutral-900">{brand.brand_name || `Marque #${brand.id}`}</strong>
              </p>
            )}
            <p className="text-sm text-neutral-500 mt-0.5">Choisissez une option et envoyez.</p>
            <button
              type="button"
              onClick={() => goToStep('profile_full')}
              className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
              Re-vérifier mes informations (profil, SIRET, catalogue)
            </button>
            {optionsWithContent.length > 0 ? (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-medium text-neutral-600">Option de rémunération</p>
                <ul className="space-y-2">
                  {optionsWithContent.map((o) => (
                    <li key={o.id}>
                      <label
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedOptionId === o.id && !isNegotiation ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="option"
                          checked={selectedOptionId === o.id && !isNegotiation}
                          onChange={() => {
                            setSelectedOptionId(o.id);
                            setIsNegotiation(false);
                          }}
                          className="mt-1 rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                        />
                        <span className="text-sm text-neutral-900 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          {o.rent != null && o.rent > 0 && (
                            <span className="font-medium">{o.rent}€{rentPeriodLabel(o.rent_period)}</span>
                          )}
                          {o.commission_percent != null && (
                            <span className="font-medium">{o.commission_percent}%</span>
                          )}
                          {o.description?.trim() && (
                            <span className="text-neutral-500 font-normal">
                              {(o.rent != null && o.rent > 0) || o.commission_percent != null ? '·' : ''} {o.description}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer mt-2 ${
                    isNegotiation ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="option"
                    checked={isNegotiation}
                    onChange={() => {
                      setIsNegotiation(true);
                      setSelectedOptionId(null);
                    }}
                    className="mt-1 rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="text-sm font-medium text-neutral-900">Proposer un autre tarif (négociation)</span>
                </label>
                {isNegotiation && (
                  <textarea
                    value={negotiationMessage}
                    onChange={(e) => setNegotiationMessage(e.target.value)}
                    placeholder="Décrivez votre proposition…"
                    rows={3}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none"
                  />
                )}
              </div>
            ) : (
              <div className="mt-5">
                <label htmlFor="nego-msg" className="block text-xs font-medium text-neutral-600 mb-1">Votre proposition (obligatoire)</label>
                <textarea
                  id="nego-msg"
                  value={negotiationMessage}
                  onChange={(e) => setNegotiationMessage(e.target.value)}
                  placeholder="Décrivez votre proposition (loyer, commission, conditions…)"
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none"
                />
              </div>
            )}
            <div className="mt-4">
              <label htmlFor="motivation" className="block text-sm font-medium text-neutral-700 mb-1">Message (optionnel)</label>
              <textarea
                id="motivation"
                value={motivationMessage}
                onChange={(e) => setMotivationMessage(e.target.value)}
                placeholder="Présentez votre marque…"
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none"
              />
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => goToStep('landing')}
                className="py-2.5 px-4 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors duration-150"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={submitCandidature}
                disabled={!canSend}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" strokeWidth={1.5} />
                Envoyer ma candidature
              </button>
            </div>
            {!canSend && (
              <p className="mt-2 text-xs text-neutral-500 text-center">
                Profil 100 % complété requis (SIRET, entreprise, catalogue).
              </p>
            )}
          </div>
        )}

        {step === 'submitting' && (
          <div className="rounded-2xl bg-white border border-black/[0.06] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
            <Loader2 className="h-10 w-10 animate-spin text-neutral-400 mx-auto" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-neutral-600">Envoi en cours…</p>
          </div>
        )}
      </div>
    </div>
  );
}
