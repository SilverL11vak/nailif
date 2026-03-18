'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function sanitizePageId(raw: string) {
  return (raw || '').trim();
}

export function MessengerBubble() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  const pageId = sanitizePageId(process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID ?? '');

  const isHome = pathname === '/' || pathname === '/en' || pathname === '/et';
  const isBookingFlow = pathname.includes('/book');
  const canRender = !isAdmin && Boolean(pageId);

  const [isConfirmStep, setIsConfirmStep] = useState(() => {
    if (!isBookingFlow) return false;
    if (typeof document === 'undefined') return false;
    return Boolean(document.getElementById('confirm-step-cta-anchor'));
  });

  const [isAllowedToRender, setIsAllowedToRender] = useState(() => {
    if (!canRender) return false;
    // On booking pages we delay the bubble until CTA area is reached.
    if (isBookingFlow) return false;
    // On home we delay bubble until user scrolls deeper.
    if (isHome) return false;
    return true;
  });

  useEffect(() => {
    if (!canRender) {
      setIsAllowedToRender(false);
      return;
    }

    // Booking flow: delay until the CTA anchor is reached to avoid overlap.
    if (isBookingFlow) {
      setIsAllowedToRender(false);
      const anchor = document.getElementById('confirm-step-cta-anchor');
        setIsConfirmStep(Boolean(anchor));
      if (!anchor) {
        const timeout = window.setTimeout(() => setIsAllowedToRender(window.scrollY > 420), 250);
        return () => window.clearTimeout(timeout);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const hit = entries.some((e) => e.isIntersecting);
          if (hit) {
            setIsAllowedToRender(true);
            observer.disconnect();
          }
        },
        { threshold: 0.01 }
      );

      observer.observe(anchor);
      return () => observer.disconnect();
    }

    if (!isHome) {
      setIsAllowedToRender(true);
      return;
    }

    // Delay messenger until user scrolls deeper into the homepage.
    // This prevents an aggressive chat bubble in the hero / first fold.
    setIsAllowedToRender(false);

    const servicesEl = document.getElementById('services');
    const testimonialsEl = document.getElementById('testimonials');
    if (!servicesEl && !testimonialsEl) {
      // Fallback: if the page structure isn't present yet, use scroll position.
      const timeout = window.setTimeout(() => setIsAllowedToRender(window.scrollY > 420), 250);
      return () => window.clearTimeout(timeout);
    }

    if (typeof window !== 'undefined' && window.scrollY > 420) {
      setIsAllowedToRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting && (e.intersectionRatio ?? 0) >= 0.08);
        if (hit) {
          setIsAllowedToRender(true);
          observer.disconnect();
        }
      },
      { threshold: [0, 0.08, 0.15] }
    );

    if (servicesEl) observer.observe(servicesEl);
    if (testimonialsEl) observer.observe(testimonialsEl);

    return () => observer.disconnect();
  }, [canRender, isHome, isBookingFlow]);

  if (!canRender || !isAllowedToRender) return null;

  const messengerUrl = `https://m.me/${pageId}`;

  const containerClasses = isBookingFlow
    ? isConfirmStep
      ? 'fixed bottom-[calc(10rem+env(safe-area-inset-bottom))] right-3 z-[40] md:bottom-6 md:right-6'
      : 'fixed bottom-[calc(4.6rem+env(safe-area-inset-bottom))] right-3 z-[40] md:bottom-6 md:right-6'
    : 'fixed bottom-[calc(5.85rem+env(safe-area-inset-bottom))] right-3 z-[45] md:bottom-6 md:right-6';

  return (
    <div className={containerClasses}>
      <div className="flex max-w-[calc(100vw-2rem)] items-center justify-end gap-2">
        <div className="hidden rounded-full border border-[#e8d3df] bg-white px-3 py-1.5 text-xs font-medium text-[#7a4563] shadow-[0_16px_28px_-20px_rgba(122,69,99,0.45)] md:block">
          Soovid abi? Kirjuta mulle
        </div>
 
        <a
          href={messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Suhtle küünetehnikuga"
          className="group relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#e8d3df] bg-white text-[#7a4563] shadow-[0_18px_30px_-20px_rgba(122,69,99,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_34px_-18px_rgba(122,69,99,0.55)] md:h-12 md:w-12"
        >
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-semibold leading-none text-white shadow-[0_8px_16px_-10px_rgba(239,68,68,0.7)]">
            1
          </span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fff4fa_0%,#ffe9f5_100%)] md:h-9 md:w-9">
            <svg viewBox="0 0 24 24" className="h-[1.35rem] w-[1.35rem] md:h-5 md:w-5" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.91 1.45 5.51 3.72 7.2V22l3.28-1.81c.95.26 1.95.4 3 .4 5.52 0 10-4.14 10-9.25S17.52 2 12 2Zm.99 12.42-2.55-2.72-4.97 2.72 5.46-5.8 2.63 2.72 4.89-2.72-5.46 5.8Z" />
            </svg>
          </span>
        </a>
      </div>
    </div>
  );
}

export default MessengerBubble;
