'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { ArrowLeft, Loader2, Check, Upload, ImageIcon } from 'lucide-react';
import type { Brand } from '@/lib/supabase';
import { BrandFichePreview } from '../components/BrandFichePreview';

const BRAND_ASSETS_BUCKET = 'brand-assets';

export default function BrandConfigPage() {
  const router = useRouter();
  const { entityType, activeBrand, refresh } = useAdminEntity();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand) {
      setLoading(false);
      return;
    }
    setBrandName(activeBrand.brand_name ?? '');
    setDescription(activeBrand.description ?? '');
    setAvatarUrl(activeBrand.avatar_url ?? '');
    setImageUrl(activeBrand.image_url ?? '');
    setLoading(false);
  }, [entityType, activeBrand]);

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

  const hasChanges =
    activeBrand &&
    (brandName.trim() !== (activeBrand.brand_name ?? '') ||
      description.trim() !== (activeBrand.description ?? '') ||
      avatarUrl.trim() !== (activeBrand.avatar_url ?? '') ||
      imageUrl.trim() !== (activeBrand.image_url ?? ''));

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
        })
        .eq('id', activeBrand.id);
      if (err) {
        setError(err.message);
        return;
      }
      setSavedSuccess(true);
      await refresh();
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
            linkToCollection
          />
        </div>
      </div>
    </div>
  );
}
