'use client';

import type { Language } from '@/lib/i18n';
import type { ShopProduct } from '@/components/shop/types';
import { ProductCard } from '@/components/shop/ProductCard';

interface ProductGridProps {
  products: ShopProduct[];
  language: Language;
  primaryCta: string;
  secondaryCta: string;
  showSecondaryCta?: boolean;
  benefitLabel: string;
  emptyText: string;
  bestSellerLabel: string;
  onAddToCart: (product: ShopProduct) => void;
  onAddToBooking: (product: ShopProduct) => void;
  onOpenProduct: (product: ShopProduct) => void;
}

export function ProductGrid({
  products,
  language,
  primaryCta,
  secondaryCta,
  showSecondaryCta = false,
  benefitLabel,
  emptyText,
  bestSellerLabel,
  onAddToCart,
  onAddToBooking,
  onOpenProduct,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-3xl border border-[#eadde5] bg-white/85 px-6 py-14 text-center text-[#6f5d6d]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          language={language}
          primaryCta={primaryCta}
          secondaryCta={secondaryCta}
          showSecondaryCta={showSecondaryCta}
          benefitLabel={benefitLabel}
          bestSellerLabel={bestSellerLabel}
          onAddToCart={onAddToCart}
          onAddToBooking={onAddToBooking}
          onOpenProduct={onOpenProduct}
        />
      ))}
    </div>
  );
}
