'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Language, getTranslation, languages } from './translations';
import { DEFAULT_LOCALE, getLocaleFromPathname, stripLocalePrefix, withLocale } from './locale-path';

export { type Language, languages };
export { getTranslation };

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  localizePath: (pathname: string, lang?: Language) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children, initialLanguage = DEFAULT_LOCALE }: { children: ReactNode; initialLanguage?: Language }) {
  const pathname = usePathname();
  const pathnameLocale = getLocaleFromPathname(pathname);
  // Important for hydration stability:
  // use deterministic initial state so server/client first render match exactly.
  // Route/cookie/localStorage reconciliation happens in effect after mount.
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    setLanguageState(pathnameLocale ?? initialLanguage);
  }, [pathnameLocale, initialLanguage]);

  const setLanguage = (lang: Language) => {
    // Route is the source of truth. State updates keep UI responsive
    // before router navigation completes.
    setLanguageState(lang);
  };

  const contextValue = useMemo<I18nContextType>(
    () => ({
      language,
      setLanguage,
      t: (key: string) => getTranslation(language, key),
      localizePath: (targetPathname: string, targetLanguage?: Language) => {
        const lang = targetLanguage ?? language;
        const basePath = stripLocalePrefix(targetPathname);
        return withLocale(basePath, lang);
      },
    }),
    [language]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    return {
      language: DEFAULT_LOCALE as Language,
      setLanguage: () => {},
      t: (key: string) => getTranslation(DEFAULT_LOCALE, key),
      localizePath: (pathname: string) => withLocale(pathname, DEFAULT_LOCALE),
    };
  }
  return context;
}
