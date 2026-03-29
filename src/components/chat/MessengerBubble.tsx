'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

function sanitizePageId(raw: string) {
  return (raw || '').trim();
}

export function MessengerBubble() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const isHome = pathname === '/' || pathname === '/en' || pathname === '/et';
  const isBookingFlow = pathname.includes('/book');
  const pageId = sanitizePageId(process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID ?? '');
  const canRender = !isAdmin && Boolean(pageId);

  const [isAllowedToRender, setIsAllowedToRender] = useState(false);
  const [isNearFooter, setIsNearFooter] = useState(false);

  useEffect(() => {
    if (!canRender) {
      setIsAllowedToRender(false);
      return;
    }
    const onScroll = () => {
      const docHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = window.scrollY / docHeight;
      setIsAllowedToRender(progress >= 0.2);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [canRender, pathname]);

  useEffect(() => {
    const footerEl = document.querySelector('footer');
    if (!footerEl) {
      setIsNearFooter(false);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        setIsNearFooter(entries.some((entry) => entry.isIntersecting));
      },
      { threshold: 0.01, rootMargin: '0px 0px 160px 0px' }
    );
    observer.observe(footerEl);
    return () => observer.disconnect();
  }, [pathname]);

  if (!canRender || !isAllowedToRender || isNearFooter) return null;

  const messengerUrl = `https://m.me/${pageId}`;
  const hasStickyMobileCta = isHome || isBookingFlow;
  const containerClasses = hasStickyMobileCta
    ? 'fixed right-6 bottom-[calc(88px+env(safe-area-inset-bottom,0px))] z-[50] motion-messenger-in md:bottom-[calc(24px+env(safe-area-inset-bottom,0px))]'
    : 'fixed right-6 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-[50] motion-messenger-in';

  return (
    <div className={containerClasses}>
      <div className="flex max-w-[calc(100vw-2rem)] items-center justify-end gap-2">
        <div className="pill-meta hidden min-h-[40px] px-3 py-1.5 text-xs md:inline-flex">
          {t('chat.bubbleHelper')}
        </div>

        <a
          href={messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('chat.bubbleAria')}
          className="icon-circle-btn group relative h-12 w-12 min-h-[48px] min-w-[48px] shrink-0 text-[#7a4563]"
        >
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-semibold leading-none text-white shadow-[0_8px_16px_-10px_rgba(239,68,68,0.7)]">
            1
          </span>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fff4fa_0%,#ffe9f5_100%)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.14 2 11.25c0 2.91 1.45 5.51 3.72 7.2V22l3.28-1.81c.95.26 1.95.4 3 .4 5.52 0 10-4.14 10-9.25S17.52 2 12 2Zm.99 12.42-2.55-2.72-4.97 2.72 5.46-5.8 2.63 2.72 4.89-2.72-5.46 5.8Z" />
            </svg>
          </span>
        </a>
      </div>
    </div>
  );
}

export default MessengerBubble;
