'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { I18nProvider } from '@/lib/i18n';
import { getLocaleFromPathname, DEFAULT_LOCALE } from '@/lib/i18n/locale-path';
import { MessengerBubble } from '@/components/chat/MessengerBubble';

const Empty = () => null;

const SmartChatWidget = dynamic(
  () =>
    import('@/components/chat/SmartChatWidget')
      .then((mod) => ({ default: mod?.SmartChatWidget ?? mod?.default ?? Empty }))
      .catch(() => ({ default: Empty })),
  { ssr: false }
);
const HomepageMotion = dynamic(
  () =>
    import('@/components/motion/HomepageMotion')
      .then((mod) => ({ default: mod?.HomepageMotion ?? mod?.default ?? Empty }))
      .catch(() => ({ default: Empty })),
  { ssr: false }
);
// Loading experience layer is intentionally disabled to keep hero/content visible immediately.

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeLocale = getLocaleFromPathname(pathname) ?? DEFAULT_LOCALE;
  const isBookingPath = pathname.includes('/book');
  const isAdminPath = pathname.startsWith('/admin');
  const isSuccessPath = pathname.includes('/success');
  const disableExperienceLayers = isBookingPath || isAdminPath || isSuccessPath;
  const enableNailifyChatWidget = false;

  return (
    <I18nProvider initialLanguage={routeLocale}>
      {!disableExperienceLayers ? <HomepageMotion /> : null}
      {children}
      <MessengerBubble />
      {!disableExperienceLayers && enableNailifyChatWidget ? <SmartChatWidget /> : null}
    </I18nProvider>
  );
}
