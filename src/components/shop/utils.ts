import type { Language } from '@/lib/i18n';

export function formatPrice(value: number, language: Language) {
  return new Intl.NumberFormat(language === 'et' ? 'et-EE' : 'en-EE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function normalizeText(value?: string | null) {
  return (value ?? '').toLowerCase();
}
