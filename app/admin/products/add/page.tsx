'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../../context/AdminEntityContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function AddProductPage() {
  const router = useRouter();
  const { entityType, activeBrand } = useAdminEntity();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [stockMax, setStockMax] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brandId = entityType === 'brand' && activeBrand ? activeBrand.id : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (brandId == null) return;
    setError(null);
    setLoading(true);
    try {
      const priceNum = parseFloat(price.replace(',', '.'));
      if (Number.isNaN(priceNum) || priceNum < 0) {
        setError('Prix invalide.');
        return;
      }
      const commission = commissionPercent.trim() ? parseFloat(commissionPercent.replace(',', '.')) : null;
      if (commission != null && (Number.isNaN(commission) || commission < 0 || commission > 100)) {
        setError('Commission entre 0 et 100.');
        return;
      }
      const stock = stockMax.trim() ? parseInt(stockMax, 10) : 0;
      if (stockMax.trim() && (Number.isNaN(stock) || stock < 0)) {
        setError('Stock max invalide.');
        return;
      }
      const { error: err } = await supabase.from('products').insert({
        brand_id: brandId,
        product_name: name.trim(),
        price: priceNum,
        description: description.trim() || null,
        image_url: imageUrl.trim() || null,
        commission_percent: commission,
        stock_max: stockMax.trim() ? stock : 0,
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.push('/admin/products');
    } finally {
      setLoading(false);
    }
  }

  if (entityType !== 'brand' || !activeBrand) {
    return (
      <div className="max-w-md mx-auto py-8 text-center">
        <p className="text-neutral-600">Sélectionnez une marque pour ajouter un produit.</p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-medium text-neutral-900 hover:underline">Retour au dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
        <ArrowLeft className="h-4 w-4" /> Retour au catalogue
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900">Ajouter un produit</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Nom du produit *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Prix (€) *</label>
          <input type="text" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="29.90" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">URL image</label>
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Commission (%)</label>
          <input type="text" inputMode="decimal" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Optionnel" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Stock max</label>
          <input type="number" min={0} value={stockMax} onChange={(e) => setStockMax(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="0" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Ajouter le produit
        </button>
      </form>
    </div>
  );
}
