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
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={1.5} />
      </div>
    );
  }

  if (entityType !== 'brand' || !activeBrand) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-sm font-light text-neutral-500">Sélectionnez une marque pour gérer le catalogue.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Catalogue</h1>
      <p className="mt-0.5 text-sm font-light text-neutral-500 mb-6">Produits de votre marque.</p>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Link href="/admin/products/add" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150">
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Ajouter
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-12 text-center">
          <Package className="h-12 w-12 text-neutral-300 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-sm font-light text-neutral-500">Aucun produit.</p>
          <Link href="/admin/products/add" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150">
            <Plus className="h-4 w-4" strokeWidth={1.5} /> Ajouter un produit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <article key={p.id} className="rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="aspect-square bg-neutral-50/80">
                {p.image_url?.trim() ? (
                  <img src={p.image_url.trim()} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-12 w-12 text-neutral-300" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-black/[0.06]">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-neutral-900 text-sm line-clamp-1">{p.product_name}</h3>
                  <p className="text-xs font-light text-neutral-500">{Number(p.price).toFixed(2)} €</p>
                </div>
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="shrink-0 p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                  aria-label="Modifier"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
