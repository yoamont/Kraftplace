'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Package, Loader2, ArrowLeft } from 'lucide-react';
import type { Brand, Product } from '@/lib/supabase';
import { ContactBrandButton } from '@/components/messaging/ContactBrandButton';

function BrandFiche({ brand }: { brand: Brand }) {
  return (
    <article className="rounded-xl border-2 border-kraft-300 bg-kraft-50 overflow-hidden shadow-sm">
      <div className="aspect-[3/1] bg-kraft-200">
        {brand.image_url?.trim() ? (
          <img src={brand.image_url.trim()} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-kraft-600">
            <span className="text-sm font-medium">Image de couverture</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-kraft-200 shrink-0 overflow-hidden flex items-center justify-center border-2 border-kraft-300">
            {brand.avatar_url?.trim() ? (
              <img src={brand.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="h-6 w-6 text-kraft-600" />
            )}
          </div>
          <h1 className="font-bold text-kraft-black text-lg">{brand.brand_name}</h1>
        </div>
        {brand.description?.trim() && (
          <p className="mt-3 text-sm text-kraft-700 leading-relaxed">{brand.description.trim()}</p>
        )}
        <div className="mt-4">
          <ContactBrandButton brandId={brand.id} />
        </div>
      </div>
    </article>
  );
}

export default function MarqueCollectionPage() {
  const params = useParams();
  const brandId = typeof params.brandId === 'string' ? params.brandId : params.brandId?.[0];
  const id = brandId ? parseInt(brandId, 10) : NaN;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!brandId || Number.isNaN(id)) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    (async () => {
      const { data: brandData, error: brandError } = await supabase.from('brands').select('*').eq('id', id).single();
      if (brandError || !brandData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBrand(brandData as Brand);
      const { data: productsData } = await supabase.from('products').select('*').eq('brand_id', id).order('created_at', { ascending: false });
      setProducts((productsData as Product[]) ?? []);
      setLoading(false);
    })();
  }, [brandId, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-kraft-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-kraft-600" />
      </div>
    );
  }

  if (notFound || !brand) {
    return (
      <div className="min-h-screen bg-kraft-50 flex flex-col items-center justify-center px-4">
        <p className="text-kraft-700 font-medium">Marque introuvable.</p>
        <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-kraft-black hover:underline">
          <ArrowLeft className="h-4 w-4" /> Retour à l’accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kraft-50">
      <header className="border-b border-kraft-300 bg-kraft-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-kraft-700 hover:text-kraft-black">
            <ArrowLeft className="h-4 w-4" /> Kraftplace
          </Link>
          <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-bold bg-kraft-black text-kraft-off-white hover:bg-kraft-900 border-2 border-kraft-black transition-colors">
            Connexion
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <BrandFiche brand={brand} />

        <section id="produits" className="mt-10">
          <h2 className="text-lg font-bold text-kraft-black mb-4">Nos produits</h2>
          {products.length === 0 ? (
            <div className="rounded-xl border-2 border-kraft-300 bg-kraft-100 p-12 text-center">
              <Package className="h-12 w-12 text-kraft-500 mx-auto mb-4" />
              <p className="text-kraft-700 font-medium">Aucun produit pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => (
                <article key={p.id} className="rounded-xl border-2 border-kraft-300 bg-kraft-50 overflow-hidden">
                  <div className="aspect-square bg-kraft-200">
                    {p.image_url?.trim() ? (
                      <img src={p.image_url.trim()} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-10 w-10 text-kraft-500" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-kraft-black line-clamp-2">{p.product_name}</h3>
                    <p className="text-kraft-700 font-bold mt-0.5">{Number(p.price).toFixed(2)} €</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
