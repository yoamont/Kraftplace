import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://kraftplace.fr';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/marques`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/boutiques`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/mentions-legales`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.1 },
  ];

  // Pages dynamiques : annonces publiées
  const dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: listings } = await supabase
      .from('listings')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (listings) {
      for (const listing of listings) {
        if (listing.slug) {
          dynamicPages.push({
            url: `${BASE_URL}/annonce/${listing.slug}`,
            lastModified: listing.updated_at ? new Date(listing.updated_at) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }
    }
  } catch {
    // Silently fail — static pages are still returned
  }

  return [...staticPages, ...dynamicPages];
}
