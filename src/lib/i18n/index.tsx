'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, getTranslation, languages } from './translations';

export { type Language, languages };
export { getTranslation };

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children, initialLanguage = 'et' }: { children: ReactNode; initialLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Load saved language from localStorage on client
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'et' || saved === 'en')) {
      setLanguage(saved);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  };

  const t = (key: string): string => {
    // During SSR or before client hydration, use initialLanguage
    const activeLang = isClient ? language : initialLanguage;
    return getTranslation(activeLang, key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    // Provide a fallback for SSR
    return {
      language: 'et' as Language,
      setLanguage: () => {},
      t: (key: string) => getTranslation('et', key),
    };
  }
  return context;
}
