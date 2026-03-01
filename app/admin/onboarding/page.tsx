'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as 'brand' | 'showroom' | null;
  const { userId, refresh } = useAdminEntity();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [brandImageUrl, setBrandImageUrl] = useState('');
  const [brandCommission, setBrandCommission] = useState('');

  const [showroomName, setShowroomName] = useState('');
  const [showroomAddress, setShowroomAddress] = useState('');
  const [showroomCity, setShowroomCity] = useState('');
  const [showroomCodePostal, setShowroomCodePostal] = useState('');
  const [showroomDescription, setShowroomDescription] = useState('');
  const [showroomImageUrl, setShowroomImageUrl] = useState('');
  const [showroomInstagram, setShowroomInstagram] = useState('');
  const [showroomPermanent, setShowroomPermanent] = useState(true);
  const [showroomStartDate, setShowroomStartDate] = useState('');
  const [showroomEndDate, setShowroomEndDate] = useState('');

  useEffect(() => {
    if (type !== 'brand' && type !== 'showroom') router.replace('/admin');
  }, [type, router]);

  async function handleCreateBrand(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || submittingRef.current) return;
    const nom = brandName.trim();
    if (!nom) {
      setError('Le nom de la marque est obligatoire.');
      return;
    }
    setError(null);
    submittingRef.current = true;
    setLoading(true);
    try {
      const commission = brandCommission.trim() ? parseFloat(brandCommission.replace(',', '.')) : null;
      if (commission != null && (Number.isNaN(commission) || commission < 0 || commission > 100)) {
        setError('Commission entre 0 et 100.');
        return;
      }
      const { error: err } = await supabase.from('brands').insert({
        owner_id: userId,
        brand_name: nom,
        description: brandDescription.trim() || null,
        image_url: brandImageUrl.trim() || null,
        default_commission_rate: commission,
        credits: 2,
      });
      if (err) {
        if (err.code === '23505') setError('Une marque avec ce nom existe déjà.');
        else setError(err.message);
        return;
      }
      await refresh();
      router.replace('/admin');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function handleCreateShowroom(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || submittingRef.current) return;
    const nom = showroomName.trim();
    if (!nom) {
      setError('Le nom du lieu est obligatoire.');
      return;
    }
    setError(null);
    submittingRef.current = true;
    setLoading(true);
    try {
      const { error: err } = await supabase.from('showrooms').insert({
        owner_id: userId,
        name: nom,
        address: showroomAddress.trim() || null,
        city: showroomCity.trim() || null,
        code_postal: showroomCodePostal.trim() || null,
        description: showroomDescription.trim() || null,
        image_url: showroomImageUrl.trim() || null,
        default_commission_rate: null,
        instagram_handle: showroomInstagram.trim() || null,
        is_permanent: showroomPermanent,
        start_date: showroomPermanent ? null : showroomStartDate || null,
        end_date: showroomPermanent ? null : showroomEndDate || null,
        publication_status: 'draft',
      });
      if (err) {
        setError(err.message);
        return;
      }
      await refresh();
      router.replace('/admin');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  if (type !== 'brand' && type !== 'showroom') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const isBrand = type === 'brand';

  return (
    <div className="max-w-xl mx-auto">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>
      <h1 className="text-2xl font-semibold text-neutral-900">{isBrand ? 'Créer ma marque' : 'Créer ma boutique'}</h1>
      <p className="mt-1 text-neutral-500 text-sm">{isBrand ? 'Renseignez les informations de votre marque.' : 'Renseignez les informations de votre lieu.'}</p>

      <form onSubmit={isBrand ? handleCreateBrand : handleCreateShowroom} className="mt-8 space-y-5">
        {isBrand ? (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nom de la marque *</label>
              <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Ex. Mellow" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea value={brandDescription} onChange={(e) => setBrandDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none" placeholder="Présentation de la marque" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">URL image</label>
              <input type="url" value={brandImageUrl} onChange={(e) => setBrandImageUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Commission par défaut (%)</label>
              <input type="text" inputMode="decimal" value={brandCommission} onChange={(e) => setBrandCommission(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Ex. 20" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Nom du lieu *</label>
              <input type="text" value={showroomName} onChange={(e) => setShowroomName(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Ex. Store Marais" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Adresse</label>
              <input type="text" value={showroomAddress} onChange={(e) => setShowroomAddress(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="12 rue de la Paix" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Ville</label>
                <input type="text" value={showroomCity} onChange={(e) => setShowroomCity(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Paris" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Code postal</label>
                <input type="text" value={showroomCodePostal} onChange={(e) => setShowroomCodePostal(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="75003" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea value={showroomDescription} onChange={(e) => setShowroomDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none" placeholder="Décrivez le lieu" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">URL image</label>
              <input type="url" value={showroomImageUrl} onChange={(e) => setShowroomImageUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
              <input type="text" value={showroomInstagram} onChange={(e) => setShowroomInstagram(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="@maboutique" />
            </div>
            <div>
              <span className="block text-sm font-medium text-neutral-900 mb-2">Type</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={showroomPermanent} onChange={() => setShowroomPermanent(true)} className="rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                  <span className="text-sm font-medium text-neutral-900">Permanent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!showroomPermanent} onChange={() => setShowroomPermanent(false)} className="rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                  <span className="text-sm font-medium text-neutral-900">Éphémère</span>
                </label>
              </div>
            </div>
            {!showroomPermanent && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Date début</label>
                  <input type="date" value={showroomStartDate} onChange={(e) => setShowroomStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Date fin</label>
                  <input type="date" value={showroomEndDate} onChange={(e) => setShowroomEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isBrand ? 'Créer ma marque' : 'Créer ma boutique'}
        </button>
      </form>
    </div>
  );
}
