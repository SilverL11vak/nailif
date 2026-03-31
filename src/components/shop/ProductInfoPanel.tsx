'use client';

import type { ShopProduct } from '@/components/shop/types';
import type { Language } from '@/lib/i18n';
import { formatPrice } from '@/components/shop/utils';

interface ProductInfoPanelProps {
  product: ShopProduct;
  language: Language;
  quantity: number;
  onQuantityChange: (next: number) => void;
  onAddToCart: () => void;
  onAddToBooking: () => void;
  primaryCta: string;
  secondaryCta: string;
  showSecondaryCta?: boolean;
  quantityLabel: string;
  categoryFallback: string;
  inStockLabel: string;
  outOfStockLabel: string;
  trustItems: string[];
}

export function ProductInfoPanel({
  product,
  language,
  quantity,
  onQuantityChange,
  onAddToCart,
  onAddToBooking,
  primaryCta,
  secondaryCta,
  showSecondaryCta = false,
  quantityLabel,
  categoryFallback,
  inStockLabel,
  outOfStockLabel,
  trustItems,
}: ProductInfoPanelProps) {
  const inStock = Boolean(product.active) && (product.stock ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="type-overline text-[#9b7890]">{product.category || categoryFallback}</p>
        <h1 className="font-brand text-5xl leading-[0.95] text-[#2f2530] sm:text-6xl">{product.name}</h1>
        <p className="max-w-[48ch] text-base leading-7 text-[#665666]">{product.description}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-3xl font-semibold text-[#2f2530]">{formatPrice(product.price, language)}</span>
        <span className={`pill-meta min-h-[34px] px-3 text-xs ${inStock ? '' : 'border-[#f3d9e4] bg-[#fff3f7] text-[#9b4768]'}`}>
          {inStock ? inStockLabel : outOfStockLabel}
        </span>
      </div>

      <div className="rounded-2xl border border-[#ecdee8] bg-white p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#5e4e5e]">{quantityLabel}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onQuantityChange(Math.max(1, quantity - 1))} className="icon-circle-btn h-9 w-9 min-h-[36px] min-w-[36px]">-</button>
            <span className="w-8 text-center text-sm font-semibold text-[#2f2530]">{quantity}</span>
            <button type="button" onClick={() => onQuantityChange(Math.min(99, quantity + 1))} className="icon-circle-btn h-9 w-9 min-h-[36px] min-w-[36px]">+</button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <button type="button" onClick={onAddToCart} className="btn-primary btn-primary-lg w-full" disabled={!inStock}>
          {primaryCta}
        </button>
        {showSecondaryCta && (
          <button type="button" onClick={onAddToBooking} className="btn-secondary btn-secondary-md w-full" disabled={!inStock}>
            {secondaryCta}
          </button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {trustItems.map((item) => (
          <p key={item} className="pill-meta min-h-[44px] justify-center text-center text-xs text-[#6b5b69]">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
