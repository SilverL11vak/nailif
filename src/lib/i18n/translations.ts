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
      return path; // Return key if not found
    }
  }
  
  return typeof current === 'string' ? current : path;
}

export function getTranslation(language: Language, key: string): string {
  const current = getNestedValue(translations[language] as unknown as Record<string, unknown>, key);
  if (current !== key) return current;
  const fallback = getNestedValue(translations.et as unknown as Record<string, unknown>, key);
  return fallback || key;
}

export const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: LOCALES[0], name: 'Estonian', nativeName: 'Eesti' },
  { code: LOCALES[1], name: 'English', nativeName: 'English' },
];
