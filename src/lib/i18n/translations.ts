import etTranslations from './et.json';
import enTranslations from './en.json';

export type Language = 'et' | 'en';

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
  const translation = getNestedValue(translations[language] as unknown as Record<string, unknown>, key);
  return translation || key;
}

export const languages: { code: Language; name: string; nativeName: string }[] = [
  { code: 'et', name: 'Estonian', nativeName: 'Eesti' },
  { code: 'en', name: 'English', nativeName: 'English' },
];
