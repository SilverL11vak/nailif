'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { I18nProvider } from '@/lib/i18n';

const SmartChatWidget = dynamic(
  () =>
    import('@/components/chat/SmartChatWidget').then(
      (mod) => mod.SmartChatWidget ?? mod.default
    ),
  { ssr: false }
);
const HomepageMotion = dynamic(
  () =>
    import('@/components/motion/HomepageMotion').then(
      (mod) => mod.HomepageMotion ?? mod.default
    ),
  { ssr: false }
);
// Loading experience layer is intentionally disabled to keep hero/content visible immediately.

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBookingPath = pathname.includes('/book');
  const isAdminPath = pathname.startsWith('/admin');
  const isSuccessPath = pathname.includes('/success');
  const disableExperienceLayers = isBookingPath || isAdminPath || isSuccessPath;

  return (
    <I18nProvider>
      {!disableExperienceLayers ? <HomepageMotion /> : null}
      {children}
      {!disableExperienceLayers ? <SmartChatWidget /> : null}
    </I18nProvider>
  );
}
