import type { Service } from '@/store/booking-types';

export type CareProductLite = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  imageUrl?: string | null;
};

function normalize(value?: string | null) {
  return (value ?? '').toLowerCase();
}

function includesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function serviceTags(service: Pick<Service, 'name' | 'category'>) {
  const text = `${normalize(service.name)} ${normalize(service.category)}`;
  if (includesAny(text, ['gel', 'geel', 'manik'])) return ['topcoat', 'oil', 'cuticle', 'shine', 'viimist', 'õli'];
  if (includesAny(text, ['acrylic', 'akr', 'extension', 'pikendus'])) return ['repair', 'serum', 'strength', 'cream', 'taast', 'tugev'];
  if (includesAny(text, ['spa', 'pedi', 'luksus'])) return ['mask', 'cream', 'hydrat', 'niisut'];
  return ['care', 'hooldus', 'repair', 'serum', 'oil'];
}

export function recommendProductsForService(
  products: CareProductLite[],
  service: Pick<Service, 'name' | 'category'> | null,
  max = 3,
  excludeIds: string[] = []
) {
  if (!service || products.length === 0) return [];
  const tags = serviceTags(service);
  const exclude = new Set(excludeIds);
  const scored = products
    .filter((product) => !exclude.has(product.id))
    .map((product) => {
      const text = `${normalize(product.name)} ${normalize(product.description)} ${normalize(product.category)}`;
      const score = tags.reduce((sum, tag) => sum + (text.includes(tag) ? 1 : 0), 0);
      return { product, score };
    })
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .map((entry) => entry.product);

  return scored.slice(0, Math.max(1, max));
}

export function recommendCrossSellProduct(
  products: CareProductLite[],
  service: Pick<Service, 'name' | 'category'> | null,
  selectedProductIds: string[]
) {
  const recs = recommendProductsForService(products, service, 5, selectedProductIds);
  return recs[0] ?? null;
}

export function getPotentialBundleSavings(selectedCount: number) {
  return selectedCount >= 2 ? 6 : 0;
}

