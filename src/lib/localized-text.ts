import type { LocaleCode } from '@/lib/i18n/locale-path';

export interface LocalizedText {
  et: string;
  en: string;
}

export function asLocalizedText(value: unknown, fallback = ''): LocalizedText {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return {
      et: normalized,
      en: normalized || fallback,
    };
  }

  if (value && typeof value === 'object') {
    const candidate = value as Partial<Record<'et' | 'en', unknown>>;
    const et = typeof candidate.et === 'string' ? candidate.et.trim() : '';
    const en = typeof candidate.en === 'string' ? candidate.en.trim() : '';
    return {
      et,
      en,
    };
  }

  return {
    et: fallback,
    en: fallback,
  };
}

export function localizeText(value: LocalizedText, locale: LocaleCode): string {
  return locale === 'en' ? value.en : value.et;
}

export function mergeLocalizedText(
  nextValue: unknown,
  existing: LocalizedText,
  options?: { trim?: boolean }
): LocalizedText {
  const trim = options?.trim ?? true;
  const next = asLocalizedText(nextValue);
  const et = next.et.length > 0 || next.en.length > 0 ? next.et : existing.et;
  const en = next.et.length > 0 || next.en.length > 0 ? next.en : existing.en;
  return {
    et: trim ? et.trim() : et,
    en: trim ? en.trim() : en,
  };
}

