'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { ArrowLeft, Loader2, Check, Upload, ImageIcon, FileText } from 'lucide-react';
import type { Brand, Badge } from '@/lib/supabase';
import { BrandFichePreview } from '../components/BrandFichePreview';
import { BadgeIcon } from '../components/BadgeIcon';

const BRAND_ASSETS_BUCKET = 'brand-assets';
const BRAND_DOCUMENTS_BUCKET = 'brand-documents';

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

export default function BrandConfigPage() {
  const router = useRouter();
  const { entityType, activeBrand, refresh } = useAdminEntity();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingRcPro, setUploadingRcPro] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const rcProInputRef = useRef<HTMLInputElement>(null);

  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [legalStatus, setLegalStatus] = useState('');
  const [legalStatusOther, setLegalStatusOther] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [siret, setSiret] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rcProAttestationPath, setRcProAttestationPath] = useState<string | null>(null);
  const [rcProSignedUrl, setRcProSignedUrl] = useState<string | null>(null);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<number[]>([]);
  const [initialBadgeIds, setInitialBadgeIds] = useState<number[]>([]);

  const MAX_BADGES = 5;

  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand) {
      setLoading(false);
      return;
    }
    (async () => {
      setBrandName(activeBrand.brand_name ?? '');
      setDescription(activeBrand.description ?? '');
      setAvatarUrl(activeBrand.avatar_url ?? '');
      setImageUrl(activeBrand.image_url ?? '');
      setLegalStatus(activeBrand.legal_status ?? '');
      setLegalStatusOther(activeBrand.legal_status_other ?? '');
      setCompanyName(activeBrand.company_name ?? '');
      setRegisteredAddress(activeBrand.registered_address ?? '');
      setSiret(activeBrand.siret ?? '');
      setEmail(activeBrand.email ?? '');
      setPhone(activeBrand.phone ?? '');
      setRcProAttestationPath(activeBrand.rc_pro_attestation_path ?? null);
      const { data: badgesData } = await supabase.from('badges').select('*').order('sort_order');
      setAllBadges((badgesData as Badge[]) ?? []);
      const { data: brandBadgesData } = await supabase.from('brand_badges').select('badge_id').eq('brand_id', activeBrand.id);
      const ids = ((brandBadgesData as { badge_id: number }[]) ?? []).map((r) => r.badge_id);
      setSelectedBadgeIds(ids);
      setInitialBadgeIds(ids);
      setLoading(false);
    })();
  }, [entityType, activeBrand]);

  useEffect(() => {
    if (!activeBrand?.rc_pro_attestation_path) {
      setRcProSignedUrl(null);
      return;
    }
    supabase.storage
      .from(BRAND_DOCUMENTS_BUCKET)
      .createSignedUrl(activeBrand.rc_pro_attestation_path, 3600)
      .then(({ data, error }) => {
        if (!error && data?.signedUrl) setRcProSignedUrl(data.signedUrl);
        else setRcProSignedUrl(null);
      });
  }, [activeBrand?.rc_pro_attestation_path, rcProAttestationPath]);

  useEffect(() => {
    if (!savedSuccess) return;
    const t = setTimeout(() => setSavedSuccess(false), 3000);
    return () => clearTimeout(t);
  }, [savedSuccess]);

  async function uploadImage(file: File, kind: 'avatar' | 'cover'): Promise<string | null> {
    if (!activeBrand) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `brands/${activeBrand.id}/${kind}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BRAND_ASSETS_BUCKET).upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      return null;
    }
    const { data } = supabase.storage.from(BRAND_ASSETS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError(null);
    setUploadingAvatar(true);
    try {
      const url = await uploadImage(file, 'avatar');
      if (url) setAvatarUrl(url);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function onCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError(null);
    setUploadingCover(true);
    try {
      const url = await uploadImage(file, 'cover');
      if (url) setImageUrl(url);
    } finally {
      setUploadingCover(false);
    }
  }

  async function onRcProFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeBrand) return;
    e.target.value = '';
    setError(null);
    setUploadingRcPro(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const path = `brands/${activeBrand.id}/rc_pro.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(BRAND_DOCUMENTS_BUCKET)
        .upload(path, file, { upsert: true });
      if (uploadError) {
        setError(uploadError.message);
        return;
      }
      setRcProAttestationPath(path);
      const { data: signed } = await supabase.storage.from(BRAND_DOCUMENTS_BUCKET).createSignedUrl(path, 3600);
      if (signed?.signedUrl) setRcProSignedUrl(signed.signedUrl);
      await refresh();
    } finally {
      setUploadingRcPro(false);
    }
  }

  function removeRcPro() {
    setRcProAttestationPath(null);
    setRcProSignedUrl(null);
  }

  const hasChanges =
    activeBrand &&
    (brandName.trim() !== (activeBrand.brand_name ?? '') ||
      description.trim() !== (activeBrand.description ?? '') ||
      avatarUrl.trim() !== (activeBrand.avatar_url ?? '') ||
      imageUrl.trim() !== (activeBrand.image_url ?? '') ||
      legalStatus !== (activeBrand.legal_status ?? '') ||
      legalStatusOther.trim() !== (activeBrand.legal_status_other ?? '') ||
      companyName.trim() !== (activeBrand.company_name ?? '') ||
      registeredAddress.trim() !== (activeBrand.registered_address ?? '') ||
      siret.trim() !== (activeBrand.siret ?? '') ||
      representativeName.trim() !== (activeBrand.representative_name ?? '') ||
      email.trim() !== (activeBrand.email ?? '') ||
      phone.trim() !== (activeBrand.phone ?? '') ||
      (rcProAttestationPath ?? '') !== (activeBrand.rc_pro_attestation_path ?? '') ||
      selectedBadgeIds.length !== initialBadgeIds.length ||
      selectedBadgeIds.some((id, i) => initialBadgeIds[i] !== id));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeBrand) return;
    setError(null);
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('brands')
        .update({
          brand_name: brandName.trim(),
          description: description.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          image_url: imageUrl.trim() || null,
          legal_status: legalStatus || null,
          legal_status_other: legalStatus === 'other' ? legalStatusOther.trim() || null : null,
          company_name: companyName.trim() || null,
          registered_address: registeredAddress.trim() || null,
          siret: siret.trim().replace(/\s/g, '') || null,
          representative_name: representativeName.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          rc_pro_attestation_path: rcProAttestationPath || null,
        })
        .eq('id', activeBrand.id);
      if (err) {
        setError(err.message);
        return;
      }
      await supabase.from('brand_badges').delete().eq('brand_id', activeBrand.id);
      if (selectedBadgeIds.length > 0) {
        const { error: errBadges } = await supabase
          .from('brand_badges')
          .insert(selectedBadgeIds.map((badge_id) => ({ brand_id: activeBrand.id, badge_id })));
        if (errBadges) {
          setError(errBadges.message);
          return;
        }
      }
      setInitialBadgeIds(selectedBadgeIds);
      setSavedSuccess(true);
      await refresh();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function toggleBadge(badgeId: number) {
    setSelectedBadgeIds((prev) => {
      if (prev.includes(badgeId)) return prev.filter((id) => id !== badgeId);
      if (prev.length >= MAX_BADGES) return prev;
      return [...prev, badgeId];
    });
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
      <div className="max-w-md mx-auto py-8 text-center">
        <p className="text-neutral-600">Sélectionnez une marque pour gérer ses informations.</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-medium text-neutral-900 hover:underline">
          Retour au dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900">Ma marque</h1>
      <p className="mt-1 text-sm text-neutral-500">Modifiez les informations affichées pour votre marque.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Nom de la marque *</label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Présentez votre marque aux showrooms…"
            className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none placeholder:text-neutral-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Avatar / logo</label>
          <div className="flex flex-wrap items-start gap-3">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onAvatarFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadingAvatar ? 'Upload…' : 'Choisir un fichier'}
            </button>
            {avatarUrl.trim() && (
              <div className="flex items-center gap-2">
                <img src={avatarUrl.trim()} alt="Aperçu avatar" className="h-16 w-16 rounded-full object-cover border border-neutral-200" />
                <button
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  className="text-sm text-neutral-500 hover:text-red-600"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Image de couverture</label>
          <div className="flex flex-wrap items-start gap-3">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onCoverFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {uploadingCover ? 'Upload…' : 'Choisir un fichier'}
            </button>
            {imageUrl.trim() && (
              <div className="flex items-center gap-2">
                <img src={imageUrl.trim()} alt="Aperçu couverture" className="h-16 w-24 rounded-lg object-cover border border-neutral-200" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-sm text-neutral-500 hover:text-red-600"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Valeurs (max {MAX_BADGES})</label>
          <p className="text-xs text-neutral-500 mb-2">Sélectionnez jusqu'à {MAX_BADGES} badges pour afficher sur votre fiche marque.</p>
          <div className="flex flex-wrap gap-2">
            {allBadges.map((badge) => {
              const checked = selectedBadgeIds.includes(badge.id);
              const disabled = !checked && selectedBadgeIds.length >= MAX_BADGES;
              return (
                <label
                  key={badge.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border cursor-pointer transition-colors ${
                    checked
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : disabled
                        ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleBadge(badge.id)}
                    className="sr-only"
                  />
                  <BadgeIcon badge={badge} className="w-4 h-3 shrink-0 inline-block" />
                  <span>{badge.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-6 mt-6">
          <h2 className="text-sm font-semibold text-neutral-900 mb-4">Informations juridiques et contact</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Statut juridique *</label>
              <select
                value={legalStatus}
                onChange={(e) => setLegalStatus(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              >
                <option value="">Sélectionnez un statut</option>
                {LEGAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {legalStatus === 'other' && (
                <input
                  type="text"
                  value={legalStatusOther}
                  onChange={(e) => setLegalStatusOther(e.target.value)}
                  placeholder="Précisez le statut juridique"
                  className="mt-2 w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 placeholder:text-neutral-400"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nom de l’entreprise *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                placeholder="Raison sociale"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 placeholder:text-neutral-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Adresse de domiciliation *</label>
              <textarea
                value={registeredAddress}
                onChange={(e) => setRegisteredAddress(e.target.value)}
                required
                rows={2}
                placeholder="Adresse du siège social"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none placeholder:text-neutral-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Numéro SIRET *</label>
              <input
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
                required
                placeholder="14 chiffres"
                maxLength={14}
                pattern="[0-9]{14}"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 placeholder:text-neutral-400"
              />
              {siret.length > 0 && siret.length !== 14 && (
                <p className="mt-0.5 text-xs text-amber-700">Le SIRET doit comporter 14 chiffres.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nom et prénom du représentant</label>
              <input
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="Jean Dupont"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 placeholder:text-neutral-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">E-mail *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="contact@entreprise.fr"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 placeholder:text-neutral-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Téléphone (optionnel)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 1 23 45 67 89"
                className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 placeholder:text-neutral-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Attestation RC Pro</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={rcProInputRef}
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  onChange={onRcProFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => rcProInputRef.current?.click()}
                  disabled={uploadingRcPro}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  {uploadingRcPro ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploadingRcPro ? 'Envoi…' : 'Choisir un fichier'}
                </button>
                {(rcProAttestationPath || rcProSignedUrl) && (
                  <span className="flex items-center gap-2 text-sm text-neutral-600">
                    <FileText className="h-4 w-4 text-neutral-500" />
                    {rcProSignedUrl ? (
                      <a href={rcProSignedUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-900 hover:underline">
                        Voir l’attestation
                      </a>
                    ) : (
                      'Fichier déposé'
                    )}
                    <button type="button" onClick={removeRcPro} className="text-neutral-500 hover:text-red-600 text-xs">
                      Supprimer
                    </button>
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">PDF ou image. Document stocké de façon sécurisée.</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:opacity-50 disabled:pointer-events-none hover:bg-neutral-800"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer
          </button>
          {savedSuccess && <span className="text-sm text-green-600">Modifications enregistrées.</span>}
        </div>
      </form>

        <div className="lg:sticky lg:top-20">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Aperçu côté boutiques</p>
          <BrandFichePreview
            brandName={brandName}
            description={description.trim() || null}
            avatarUrl={avatarUrl.trim() || null}
            imageUrl={imageUrl.trim() || null}
            brandId={activeBrand.id}
            badges={allBadges.filter((b) => selectedBadgeIds.includes(b.id))}
            linkToCollection
          />
        </div>
      </div>
    </div>
  );
}
