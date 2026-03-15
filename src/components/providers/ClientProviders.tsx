'use client';

import { I18nProvider } from '@/lib/i18n';
import { MessengerChat } from '@/components/chat/MessengerChat';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      {children}
      <MessengerChat />
    </I18nProvider>
  );
}
