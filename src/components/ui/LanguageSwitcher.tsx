'use client';

import { useTranslation, languages, Language } from '@/lib/i18n';
import { usePathname, useRouter } from 'next/navigation';

export function LanguageSwitcher() {
  const { language, setLanguage, localizePath } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    router.push(localizePath(pathname, newLang));
  };

  return (
    <div className="flex items-center gap-1 rounded-full border border-[#e7d7e1] bg-white/85 p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`pill-selectable min-h-[36px] px-3 text-sm ${
            language === lang.code ? 'is-selected' : ''
          }`}
        >
          {lang.nativeName}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
