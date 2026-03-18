// Server-side data fetching for homepage
// This runs ONLY on the server during SSR

import { listProducts, type Product } from '@/lib/catalog';
import { listGalleryImages, type GalleryImage } from '@/lib/gallery';
import { listServices, type ServiceRecord } from '@/lib/catalog';
import { listHomepageMedia, type HomepageMediaItem } from '@/lib/homepage-media';
import { listUpcomingAvailableSlots, type SlotRecord } from '@/lib/slots';
import { getHomepageSectionsAll } from '@/lib/homepage-content';
import { cache } from 'react';

export interface HomepageData {
  products: Product[];
  gallery: GalleryImage[];
  services: ServiceRecord[];
  homepageMedia: Record<string, HomepageMediaItem>;
  homepageSections: Record<string, string>;
  nextSlot: { date: string; time?: string } | null;
}

/**
 * Cached version of getHomepageData - use this in Server Components
 * The cache ensures data is only fetched once per request
 */
export const getHomepageDataCached = cache(async (locale: string = 'et'): Promise<HomepageData> => {
  // Parallel fetching for performance
  const [products, gallery, services, homepageMedia, slots, homepageSections]: [
    Product[], 
    GalleryImage[], 
    ServiceRecord[], 
    HomepageMediaItem[], 
    SlotRecord[],
    Record<string, string>
  ] = await Promise.all([
    listProducts(true, locale),
    listGalleryImages(),
    listServices(locale),
    listHomepageMedia(),
    listUpcomingAvailableSlots(1),
    getHomepageSectionsAll(locale as 'et' | 'en'),
  ]);

  // Convert homepageMedia array to record for easier lookup
  const homepageMediaRecord: Record<string, HomepageMediaItem> = {};
  for (const item of homepageMedia) {
    homepageMediaRecord[item.key] = item;
  }

  const nextSlot = slots && slots.length > 0 
    ? { date: slots[0].date, time: slots[0].time } 
    : null;

  return {
    products,
    gallery,
    services,
    homepageMedia: homepageMediaRecord,
    homepageSections,
    nextSlot,
  };
});

/**
 * Legacy function - now just calls the cached version
 */
export async function getHomepageData(locale: string = 'et'): Promise<HomepageData> {
  return getHomepageDataCached(locale);
}
