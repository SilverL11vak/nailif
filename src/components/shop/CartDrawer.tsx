'use client';

import { Minus, Plus, X } from 'lucide-react';
import { formatPrice } from '@/components/shop/utils';
import type { ShopProduct } from '@/components/shop/types';
import type { Language } from '@/lib/i18n';
import type { StoredCartItem } from '@/hooks/use-cart';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  language: Language;
  productsById: Map<string, ShopProduct>;
  items: StoredCartItem[];
  total: number;
  email: string;
  onEmailChange: (value: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onCheckout: () => void;
  checkoutDisabled: boolean;
  isPaying: boolean;
  copy: {
    title: string;
    empty: string;
    total: string;
    email: string;
    checkout: string;
    redirecting: string;
    close: string;
    emailPlaceholder: string;
  };
}

export function CartDrawer({
  open,
  onClose,
  language,
  productsById,
  items,
  total,
  email,
  onEmailChange,
  onQuantityChange,
  onCheckout,
  checkoutDisabled,
  isPaying,
  copy,
}: CartDrawerProps) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-hidden={!open}
        className={`fixed inset-0 z-[90] bg-[#1f141d]/40 transition-opacity ${open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      />

      <aside
        className={`fixed right-0 top-0 z-[95] h-full w-full max-w-md transform border-l border-[#ead9e3] bg-white p-5 shadow-[-28px_0_48px_-34px_rgba(64,39,58,0.45)] transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="type-h3 text-[#2f2530]">{copy.title}</h2>
          <button type="button" onClick={onClose} className="icon-circle-btn" aria-label={copy.close}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">
          {items.length === 0 && <p className="text-sm text-[#6f5d6d]">{copy.empty}</p>}

          {items.map((item) => {
            const product = productsById.get(item.productId);
            if (!product) return null;
            return (
              <div key={item.productId} className="rounded-2xl border border-[#f0e2eb] bg-[#fff9fc] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#2f2530]">{product.name}</p>
                    <p className="mt-0.5 text-xs text-[#8a6b7e]">{formatPrice(product.price, language)}</p>
                  </div>
                  <span className="text-sm font-semibold text-[#2f2530]">{formatPrice(product.price * item.quantity, language)}</span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => onQuantityChange(item.productId, item.quantity - 1)} className="icon-circle-btn h-9 w-9 min-h-[36px] min-w-[36px]">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-[#2f2530]">{item.quantity}</span>
                  <button type="button" onClick={() => onQuantityChange(item.productId, item.quantity + 1)} className="icon-circle-btn h-9 w-9 min-h-[36px] min-w-[36px]">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <label className="mt-5 block text-sm font-medium text-[#534253]">
          {copy.email}
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder={copy.emailPlaceholder}
            className="mt-1.5 w-full rounded-xl border border-[#e5e0e3] bg-[#faf8f9] px-3 py-2.5 text-sm focus:border-[#c24d86] focus:outline-none focus:ring-1 focus:ring-[#c24d86]/20"
          />
        </label>

        <div className="mt-4 rounded-2xl border border-[#f0e2eb] bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#6f5d6d]">{copy.total}</span>
            <span className="text-xl font-semibold text-[#2f2530]">{formatPrice(total, language)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCheckout}
          disabled={checkoutDisabled}
          className="btn-primary btn-primary-lg mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPaying ? copy.redirecting : copy.checkout}
        </button>
      </aside>

    </>
  );
}
