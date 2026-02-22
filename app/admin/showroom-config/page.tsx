'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { ArrowLeft, Loader2, Check, Trash2, Upload, ImageIcon } from 'lucide-react';
import type { Showroom, ShowroomCommissionOption } from '@/lib/supabase';
import { ShowroomFichePreview } from '../components/ShowroomFichePreview';

type RentPeriodValue = 'week' | 'month' | 'one_off';

type CommissionOptionForm = {
  id?: number;
  rent: string;
  rentPeriod: RentPeriodValue;
  commissionPercent: string;
  description: string;
};

type FormSnapshot = {
  name: string;
  address: string;
  city: string;
  codePostal: string;
  description: string;
  avatarUrl: string;
  imageUrl: string;
  instagramHandle: string;
  isPermanent: boolean;
  startDate: string;
  endDate: string;
  candidatureOpenFrom: string;
  candidatureOpenTo: string;
  publicationStatus: 'draft' | 'published';
  commissionOptions: CommissionOptionForm[];
};

function optionFromRow(o: ShowroomCommissionOption): CommissionOptionForm {
  const period = o.rent_period === 'week' || o.rent_period === 'one_off' ? o.rent_period : 'month';
  return {
    id: o.id,
    rent: o.rent != null ? String(o.rent) : '',
    rentPeriod: period,
    commissionPercent: o.commission_percent != null ? String(o.commission_percent) : '',
    description: o.description ?? '',
  };
}

function snapshotFromShowroom(s: Showroom, options: ShowroomCommissionOption[]): FormSnapshot {
  const opts = options
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(optionFromRow);
  while (opts.length < 3) opts.push({ rent: '', rentPeriod: 'month', commissionPercent: '', description: '' });
  return {
    name: s.name ?? '',
    address: s.address ?? '',
    city: s.city ?? '',
    codePostal: s.code_postal ?? '',
    description: s.description ?? '',
    avatarUrl: s.avatar_url ?? '',
    imageUrl: s.image_url ?? '',
    instagramHandle: s.instagram_handle ?? '',
    isPermanent: s.is_permanent ?? true,
    startDate: s.start_date ?? '',
    endDate: s.end_date ?? '',
    candidatureOpenFrom: s.candidature_open_from ?? '',
    candidatureOpenTo: s.candidature_open_to ?? '',
    publicationStatus: s.publication_status ?? 'draft',
    commissionOptions: opts.slice(0, 3),
  };
}

export default function ShowroomConfigPage() {
  const router = useRouter();
  const { entityType, activeShowroom } = useAdminEntity();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isPermanent, setIsPermanent] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [candidatureOpenFrom, setCandidatureOpenFrom] = useState('');
  const [candidatureOpenTo, setCandidatureOpenTo] = useState('');
  const [publicationStatus, setPublicationStatus] = useState<'draft' | 'published'>('draft');
  const [commissionOptions, setCommissionOptions] = useState<CommissionOptionForm[]>([
    { rent: '', rentPeriod: 'month', commissionPercent: '', description: '' },
    { rent: '', rentPeriod: 'month', commissionPercent: '', description: '' },
    { rent: '', rentPeriod: 'month', commissionPercent: '', description: '' },
  ]);

  const [initialSnapshot, setInitialSnapshot] = useState<FormSnapshot | null>(null);

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: optionsData } = await supabase
        .from('showroom_commission_options')
        .select('*')
        .eq('showroom_id', activeShowroom.id)
        .order('sort_order');
      const options = (optionsData as ShowroomCommissionOption[]) ?? [];
      const snap = snapshotFromShowroom(activeShowroom, options);
      setInitialSnapshot(snap);
      setName(snap.name);
      setAddress(snap.address);
      setCity(snap.city);
      setCodePostal(snap.codePostal);
      setDescription(snap.description);
      setAvatarUrl(snap.avatarUrl);
      setImageUrl(snap.imageUrl);
      setInstagramHandle(snap.instagramHandle);
      setIsPermanent(snap.isPermanent);
      setStartDate(snap.startDate);
      setEndDate(snap.endDate);
      setCandidatureOpenFrom(snap.candidatureOpenFrom);
      setCandidatureOpenTo(snap.candidatureOpenTo);
      setPublicationStatus(snap.publicationStatus);
      setCommissionOptions(snap.commissionOptions);
      setLoading(false);
    })();
  }, [entityType, activeShowroom]);

  const currentSnapshot: FormSnapshot = useMemo(
    () => ({
      name,
      address,
      city,
      codePostal,
      description,
      avatarUrl,
      imageUrl,
      instagramHandle,
      isPermanent,
      startDate,
      endDate,
      candidatureOpenFrom,
      candidatureOpenTo,
      publicationStatus,
      commissionOptions,
    }),
    [name, address, city, codePostal, description, avatarUrl, imageUrl, instagramHandle, isPermanent, startDate, endDate, candidatureOpenFrom, candidatureOpenTo, publicationStatus, commissionOptions]
  );

  const hasChanges = useMemo(() => {
    if (!initialSnapshot) return false;
    const optsSame =
      initialSnapshot.commissionOptions.length === currentSnapshot.commissionOptions.length &&
      initialSnapshot.commissionOptions.every(
        (o, i) =>
          o.rent === currentSnapshot.commissionOptions[i]?.rent &&
          o.rentPeriod === currentSnapshot.commissionOptions[i]?.rentPeriod &&
          o.commissionPercent === currentSnapshot.commissionOptions[i]?.commissionPercent &&
          o.description === currentSnapshot.commissionOptions[i]?.description
      );
    return (
      !optsSame ||
      initialSnapshot.name !== currentSnapshot.name ||
      initialSnapshot.address !== currentSnapshot.address ||
      initialSnapshot.city !== currentSnapshot.city ||
      initialSnapshot.codePostal !== currentSnapshot.codePostal ||
      initialSnapshot.description !== currentSnapshot.description ||
      initialSnapshot.avatarUrl !== currentSnapshot.avatarUrl ||
      initialSnapshot.imageUrl !== currentSnapshot.imageUrl ||
      initialSnapshot.instagramHandle !== currentSnapshot.instagramHandle ||
      initialSnapshot.isPermanent !== currentSnapshot.isPermanent ||
      initialSnapshot.startDate !== currentSnapshot.startDate ||
      initialSnapshot.endDate !== currentSnapshot.endDate ||
      initialSnapshot.candidatureOpenFrom !== currentSnapshot.candidatureOpenFrom ||
      initialSnapshot.candidatureOpenTo !== currentSnapshot.candidatureOpenTo ||
      initialSnapshot.publicationStatus !== currentSnapshot.publicationStatus
    );
  }, [initialSnapshot, currentSnapshot]);

  function setCommissionOption(index: number, field: keyof CommissionOptionForm, value: string) {
    setCommissionOptions((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = { rent: '', rentPeriod: 'month', commissionPercent: '', description: '' };
      next[index] = { ...next[index], [field]: value as string };
      return next;
    });
  }

  function clearCommissionOption(index: number) {
    setCommissionOptions((prev) => {
      const next = [...prev];
      next[index] = { rent: '', rentPeriod: 'month', commissionPercent: '', description: '' };
      return next;
    });
  }

  useEffect(() => {
    if (savedSuccess) {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
      savedTimeoutRef.current = setTimeout(() => setSavedSuccess(false), 3000);
    }
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, [savedSuccess]);

  const SHOWROOM_ASSETS_BUCKET = 'showroom-assets';

  async function uploadImage(file: File, kind: 'avatar' | 'cover'): Promise<string | null> {
    if (!activeShowroom) return null;
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `showrooms/${activeShowroom.id}/${kind}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(SHOWROOM_ASSETS_BUCKET).upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      return null;
    }
    const { data } = supabase.storage.from(SHOWROOM_ASSETS_BUCKET).getPublicUrl(path);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeShowroom) return;
    setError(null);
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('showrooms')
        .update({
          name: name.trim(),
          address: address.trim() || null,
          city: city.trim() || null,
          code_postal: codePostal.trim() || null,
          description: description.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          image_url: imageUrl.trim() || null,
          default_commission_rate: null,
          instagram_handle: instagramHandle.trim() || null,
          is_permanent: isPermanent,
          start_date: isPermanent ? null : startDate || null,
          end_date: isPermanent ? null : endDate || null,
          candidature_open_from: candidatureOpenFrom.trim() || null,
          candidature_open_to: candidatureOpenTo.trim() || null,
          publication_status: publicationStatus,
        })
        .eq('id', activeShowroom.id);
      if (err) {
        setError(err.message);
        return;
      }
      await supabase.from('showroom_commission_options').delete().eq('showroom_id', activeShowroom.id);
      const toInsert = commissionOptions
        .map((o, i) => {
          const rent = o.rent.trim() ? parseFloat(o.rent.replace(',', '.')) : null;
          const commission = o.commissionPercent.trim() ? parseInt(o.commissionPercent, 10) : null;
          const desc = o.description.trim() || null;
          if (rent == null && commission == null && !desc) return null;
          const period = (o.rentPeriod === 'week' || o.rentPeriod === 'one_off' ? o.rentPeriod : 'month') as 'week' | 'month' | 'one_off';
          return {
            showroom_id: activeShowroom.id,
            sort_order: i + 1,
            rent: rent != null && !Number.isNaN(rent) ? rent : null,
            rent_period: rent != null && !Number.isNaN(rent) ? period : null,
            commission_percent: commission != null && !Number.isNaN(commission) ? commission : null,
            description: desc,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r != null);
      if (toInsert.length > 0) {
        const { error: errOpts } = await supabase.from('showroom_commission_options').insert(toInsert);
        if (errOpts) {
          setError(errOpts.message);
          return;
        }
      }
      const optsSnapshot = commissionOptions.map((o) => ({ ...o }));
      while (optsSnapshot.length < 3) optsSnapshot.push({ rent: '', rentPeriod: 'month', commissionPercent: '', description: '' });
      setInitialSnapshot({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        codePostal: codePostal.trim(),
        description: description.trim(),
        avatarUrl: avatarUrl.trim(),
        imageUrl: imageUrl.trim(),
        instagramHandle: instagramHandle.trim(),
        isPermanent: isPermanent,
        startDate: startDate,
        endDate: endDate,
        candidatureOpenFrom: candidatureOpenFrom,
        candidatureOpenTo: candidatureOpenTo,
        publicationStatus: publicationStatus,
        commissionOptions: optsSnapshot.slice(0, 3),
      });
      setSavedSuccess(true);
      setError(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (entityType !== 'showroom' || !activeShowroom) {
    return (
      <div className="max-w-md mx-auto py-8 text-center">
        <p className="text-neutral-600">Sélectionnez une boutique pour modifier ses informations.</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-medium text-neutral-900 hover:underline">Retour au dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900">Ma boutique</h1>
      <p className="mt-1 text-sm text-neutral-500">Modifiez les informations affichées aux marques.</p>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Nom *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Ville</label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Code postal</label>
            <input type="text" value={codePostal} onChange={(e) => setCodePostal(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Adresse</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Logo / avatar</label>
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
                <img src={avatarUrl.trim()} alt="Aperçu logo" className="h-14 w-14 rounded-full object-cover border border-neutral-200" />
                <button type="button" onClick={() => setAvatarUrl('')} className="text-sm text-neutral-500 hover:text-red-600">
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
                <button type="button" onClick={() => setImageUrl('')} className="text-sm text-neutral-500 hover:text-red-600">
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 mb-2">Options de rémunération (jusqu’à 3)</h2>
          <p className="text-xs text-neutral-500 mb-3">Proposez jusqu’à 3 modèles : loyer et/ou % sur les ventes + description (ex. m², type d’espace).</p>
          <div className="space-y-4">
            {[0, 1, 2].map((index) => {
              const opt = commissionOptions[index] ?? { rent: '', rentPeriod: 'month', commissionPercent: '', description: '' };
              const hasContent = opt.rent.trim() || opt.commissionPercent.trim() || opt.description.trim();
              return (
                <div key={index} className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-700">Option {index + 1}</span>
                    {hasContent && (
                      <button type="button" onClick={() => clearCommissionOption(index)} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
                        <Trash2 className="h-3.5 w-3.5" /> Vider
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2 flex flex-wrap gap-3 items-end">
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Loyer (€)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={opt.rent}
                          onChange={(e) => setCommissionOption(index, 'rent', e.target.value)}
                          placeholder="Ex. 500"
                          className="w-28 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Période</label>
                        <select
                          value={opt.rentPeriod}
                          onChange={(e) => setCommissionOption(index, 'rentPeriod', e.target.value as RentPeriodValue)}
                          className="px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm"
                        >
                          <option value="week">Semaine</option>
                          <option value="month">Mois</option>
                          <option value="one_off">Unique</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 mb-1">Commission sur ventes (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={opt.commissionPercent}
                        onChange={(e) => setCommissionOption(index, 'commissionPercent', e.target.value)}
                        placeholder="Ex. 20"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 mb-1">Description (m², type d’espace)</label>
                    <textarea
                      value={opt.description}
                      onChange={(e) => setCommissionOption(index, 'description', e.target.value)}
                      rows={2}
                      placeholder="Ex. 12 m² en vitrine, emplacement central"
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm resize-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
          <input type="text" value={instagramHandle} onChange={(e) => setInstagramHandle(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="@maboutique" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="permanent" checked={isPermanent} onChange={(e) => setIsPermanent(e.target.checked)} className="rounded border-neutral-300" />
          <label htmlFor="permanent" className="text-sm text-neutral-700">Lieu permanent</label>
        </div>
        {!isPermanent && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date début</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date fin</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
        )}
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 mb-1">Ouverture des candidatures</h2>
          <p className="text-xs text-neutral-500 mb-2">Période pendant laquelle les marques peuvent cliquer sur « Candidater ». Vide = toujours ouvert.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date d’ouverture</label>
              <input type="date" value={candidatureOpenFrom} onChange={(e) => setCandidatureOpenFrom(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Date de clôture</label>
              <input type="date" value={candidatureOpenTo} onChange={(e) => setCandidatureOpenTo(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Publication</label>
          <select value={publicationStatus} onChange={(e) => setPublicationStatus(e.target.value as 'draft' | 'published')} className="w-full max-w-[200px] px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900">
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="py-3 px-6 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Enregistrer
          </button>
          {!hasChanges && !savedSuccess && (
            <span className="text-sm text-neutral-500">Aucune modification</span>
          )}
          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
              <Check className="h-4 w-4" />
              Enregistré
            </span>
          )}
        </div>
      </form>

        <div className="lg:sticky lg:top-20">
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Aperçu côté marques</p>
          <ShowroomFichePreview
            name={name}
            city={city}
            description={description}
            avatarUrl={avatarUrl}
            imageUrl={imageUrl}
            isPermanent={isPermanent}
            startDate={startDate}
            endDate={endDate}
            candidatureOpenFrom={candidatureOpenFrom}
            candidatureOpenTo={candidatureOpenTo}
            commissionOptions={commissionOptions}
          />
        </div>
      </div>
    </div>
  );
}
