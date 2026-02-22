'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Package, Plus, Pencil, Loader2 } from 'lucide-react';
import type { Product } from '@/lib/supabase';

export default function ProductsPage() {
  const { entityType, activeBrand, loading: entityLoading } = useAdminEntity();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const brandId = entityType === 'brand' && activeBrand ? activeBrand.id : null;

  useEffect(() => {
    if (!brandId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase.from('products').select('*').eq('brand_id', brandId).order('created_at', { ascending: false });
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    })();
  }, [brandId]);

  if (entityLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (entityType !== 'brand' || !activeBrand) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-neutral-600">Sélectionnez une marque dans le menu pour gérer le catalogue.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-neutral-900">Mon Catalogue</h1>
        <Link href="/admin/products/add" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
          <Plus className="h-4 w-4" /> Ajouter un produit
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
          <Package className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
          <p className="text-neutral-600">Aucun produit. Ajoutez-en un pour commencer.</p>
          <Link href="/admin/products/add" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
            <Plus className="h-4 w-4" /> Ajouter un produit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <article key={p.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="aspect-square bg-neutral-100">
                {p.image_url?.trim() ? (
                  <img src={p.image_url.trim()} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-neutral-300" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-neutral-100 bg-neutral-50/50">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-neutral-900 text-sm line-clamp-1">{p.product_name}</h3>
                  <p className="text-neutral-600 font-medium text-sm">{Number(p.price).toFixed(2)} €</p>
                </div>
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="shrink-0 p-2 rounded-lg text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                  aria-label="Modifier le produit"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
