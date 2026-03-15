'use client';

import { useTranslation, languages, Language } from '@/lib/i18n';
import { useRouter } from 'next/navigation';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation();
  const router = useRouter();

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    
    // Update URL
    const currentPath = window.location.pathname;
    if (newLang === 'et') {
      // Remove /en prefix if present
      if (currentPath.startsWith('/en')) {
        router.push(currentPath.replace('/en', '') || '/');
      }
    } else {
      // Add /en prefix if not present
      if (!currentPath.startsWith('/en')) {
        router.push(`/en${currentPath}`);
      }
    }
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
