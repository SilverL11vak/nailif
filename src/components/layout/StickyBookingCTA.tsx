'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useBookingStore } from '@/store/booking-store';
import { useTranslation } from '@/lib/i18n';
import { useBookingContent } from '@/hooks/use-booking-content';

interface StickyBookingCTAProps {
  hideOnPaths?: string[];
}

export function StickyBookingCTA({ hideOnPaths = [] }: StickyBookingCTAProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const { text } = useBookingContent();
  const [isVisible, setIsVisible] = useState(false);

  const { selectedService, totalPrice } = useBookingStore();

  const shouldHide = hideOnPaths.some((path) => pathname.startsWith(path));

  const handleScroll = useCallback(() => {
    if (shouldHide) {
      setIsVisible(false);
      return;
    }
    setIsVisible(window.scrollY > 200);
  }, [shouldHide]);

  useEffect(() => {
    if (shouldHide) {
      setIsVisible(false);
      return;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll, shouldHide, pathname]);

  const handleClick = () => {
    const heroElement = document.getElementById('hero-booking');
    if (heroElement) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      heroElement.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    } else {
      router.push('/book');
    }
  };

  if (!isVisible) return null;

  const defaultPrimary = t('nav.bookNow');
  const defaultHelper = t('widget.selectTime');
  const configuredPrimary = text('sticky_cta_label', defaultPrimary);
  const configuredHelper = text('sticky_cta_helper', defaultHelper);

  return (
    <>
      <div className="safe-area-bottom fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="border-t border-[#f1e2ea] bg-white/88 px-4 py-2.5 shadow-[0_-14px_24px_-24px_rgba(124,82,109,0.34)] backdrop-blur-xl">
          <button
            onClick={handleClick}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c24d86] py-3 font-semibold text-[0.95rem] text-white shadow-[0_16px_24px_-20px_rgba(141,60,108,0.52)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a93d71] active:scale-[0.99]"
          >
            {selectedService ? (
              <>
                <span>
                  {configuredPrimary}: {selectedService.name}
                </span>
                {totalPrice > 0 && <span className="opacity-80">€{totalPrice}</span>}
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {configuredPrimary}
              </>
            )}
          </button>
          {!selectedService && <p className="mt-1 text-center text-[11px] text-[#7d6586]">{configuredHelper}</p>}
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 md:block">
        <button
          onClick={handleClick}
          className="inline-flex min-w-[280px] items-center justify-center gap-2 rounded-full bg-[#c24d86] px-6 py-3 font-semibold text-white shadow-[0_24px_34px_-20px_rgba(141,60,108,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#a93d71]"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {selectedService ? `${configuredPrimary}: ${selectedService.name}` : configuredPrimary}
        </button>
      </div>
      <style jsx>{`
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </>
  );
}

export default StickyBookingCTA;
