'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FavoriteHeartIcon } from '@/components/ui/FavoriteHeartIcon';
import { Globe } from 'lucide-react';
import type { Language } from '@/lib/i18n';

interface ShopNavBarCopy {
  backToHome: string;
  nav: { home: string; services: string; gallery: string; shop: string; contact: string; book: string };
}

interface ShopNavBarProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  localizePath: (path: string) => string;
  copy: ShopNavBarCopy;
  favoritesCount?: number;
}

export function ShopNavBar({ language, setLanguage, localizePath, copy, favoritesCount = 0 }: ShopNavBarProps) {
  const router = useRouter();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-[#f1e1ea] bg-white/92 backdrop-blur-xl shadow-[0_18px_38px_-30px_rgba(97,48,85,0.12)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href={localizePath('/')}
              className="font-brand text-2xl font-semibold leading-none tracking-tight text-[#c24d86] hover:text-[#a93d71] lg:text-3xl"
            >
              Nailify
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href={localizePath('/')} className="text-sm font-medium text-[#584a58] hover:text-[#2f2530] transition-colors">
                {copy.nav.home}
              </Link>
              <Link href={`${localizePath('/')}#services`} className="text-sm font-medium text-[#584a58] hover:text-[#2f2530] transition-colors">
                {copy.nav.services}
              </Link>
              <Link href={`${localizePath('/')}#gallery`} className="text-sm font-medium text-[#584a58] hover:text-[#2f2530] transition-colors">
                {copy.nav.gallery}
              </Link>
              <Link href={localizePath('/shop')} className="text-sm font-semibold text-[#2f2530]">{copy.nav.shop}</Link>
              <Link href={`${localizePath('/')}#location`} className="text-sm font-medium text-[#584a58] hover:text-[#2f2530] transition-colors">
                {copy.nav.contact}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setLangMenuOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#fdf8fb] hover:text-[#4b5563]"
                aria-label="Language"
              >
                <Globe size={18} strokeWidth={1.8} />
              </button>
              {langMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-12 z-50 w-36 rounded-xl border border-[#ecdce6] bg-white p-1.5 shadow-lg">
                    <button
                      onClick={() => { setLanguage('et'); setLangMenuOpen(false); }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm ${language === 'et' ? 'bg-[#fff2f9] font-medium text-[#6a3b57]' : 'text-[#5f4f5f] hover:bg-[#fff7fc]'}`}
                    >
                      Eesti
                    </button>
                    <button
                      onClick={() => { setLanguage('en'); setLangMenuOpen(false); }}
                      className={`mt-0.5 w-full rounded-lg px-3 py-2 text-left text-sm ${language === 'en' ? 'bg-[#fff2f9] font-medium text-[#6a3b57]' : 'text-[#5f4f5f] hover:bg-[#fff7fc]'}`}
                    >
                      English
                    </button>
                  </div>
                </>
              )}
            </div>
            <Link
              href={localizePath('/favorites')}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#fdf8fb] hover:text-[#4b5563]"
              aria-label={language === 'en' ? 'Favourites' : 'Lemmikud'}
            >
              <FavoriteHeartIcon active={favoritesCount > 0} size={18} />
              {favoritesCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#c24d86] px-1 text-[10px] font-semibold text-white">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => router.push(localizePath('/book'))}
              className="rounded-full bg-[#c24d86] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(194,77,134,0.5)] hover:bg-[#a93d71] transition-colors"
            >
              {copy.nav.book}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
