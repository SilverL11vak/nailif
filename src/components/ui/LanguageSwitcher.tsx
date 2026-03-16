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
    <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`
            px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
            ${language === lang.code
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          {lang.nativeName}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
