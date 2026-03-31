'use client';

import Image from 'next/image';
import { Package } from 'lucide-react';
import type { ShopProduct } from '@/components/shop/types';
import { formatPrice } from '@/components/shop/utils';
import type { Language } from '@/lib/i18n';

interface ProductCardProps {
  product: ShopProduct;
  language: Language;
  primaryCta: string;
  secondaryCta: string;
  showSecondaryCta?: boolean;
  benefitLabel: string;
  bestSellerLabel: string;
  onAddToCart: (product: ShopProduct) => void;
  onAddToBooking: (product: ShopProduct) => void;
  onOpenProduct: (product: ShopProduct) => void;
}

export function ProductCard({
  product,
  language,
  primaryCta,
  secondaryCta,
  showSecondaryCta = false,
  benefitLabel,
  bestSellerLabel,
  onAddToCart,
  onAddToBooking,
  onOpenProduct,
}: ProductCardProps) {
  return (
    <article className="group rounded-[24px] bg-white p-4 shadow-[0_18px_34px_-26px_rgba(64,39,58,0.28)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_42px_-24px_rgba(64,39,58,0.36)]">
      <button
        type="button"
        onClick={() => onOpenProduct(product)}
        className="relative block w-full overflow-hidden rounded-[18px] bg-[#f6ebf2]"
      >
        <div className="relative aspect-[4/5] w-full">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              unoptimized
              loading="lazy"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 46vw, 30vw"
              className="motion-image-zoom object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#8f7187]">
              <Package className="h-10 w-10 opacity-50" />
            </div>
          )}
        </div>
      </button>

      <div className="mt-4 space-y-2">
        <h3 className="line-clamp-1 text-base font-semibold text-[#2f2530]">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-[#6f5d6d]">{product.description}</p>
        <p className="text-xs font-medium text-[#926c85]">{benefitLabel}</p>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xl font-semibold text-[#2f2530]">{formatPrice(product.price, language)}</span>
        {product.isPopular && <span className="pill-tag px-3 text-[11px]">{bestSellerLabel}</span>}
      </div>

      <div className="mt-4 space-y-2">
        <button type="button" onClick={() => onAddToCart(product)} className="btn-primary btn-primary-md w-full">
          {primaryCta}
        </button>
        {showSecondaryCta && (
          <button type="button" onClick={() => onAddToBooking(product)} className="btn-secondary btn-secondary-md w-full">
            {secondaryCta}
          </button>
        )}
      </div>
    </article>
  );
}
