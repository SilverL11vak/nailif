import etTranslations from './et.json';
import enTranslations from './en.json';
import { LOCALES, type LocaleCode } from './locale-path';

export type Language = LocaleCode;

const translations: Record<Language, typeof etTranslations> = {
  et: etTranslations,
  en: enTranslations,
};

// Helper to get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return '';
    }
  }
  
  return typeof current === 'string' ? current : '';
}

export function getTranslation(language: Language, key: string): string {
  const current = getNestedValue(translations[language] as unknown as Record<string, unknown>, key);
  if (current) return current;

  if (typeof window !== 'undefined') {
    // Strict i18n mode: never fallback to another locale.
    // Missing keys are logged for admin/content follow-up.
    console.error(`[i18n] Missing translation key "${key}" for locale "${language}"`);
  }

  return '';
}

export const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: LOCALES[0], name: 'Estonian', nativeName: 'Eesti' },
  { code: LOCALES[1], name: 'English', nativeName: 'English' },
];
