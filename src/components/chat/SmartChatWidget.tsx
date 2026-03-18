'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { openMessengerHandoff } from './messenger-handoff';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

interface AssistantApiResponse {
  ok?: boolean;
  reply?: string;
  handoffSuggested?: boolean;
  debug?: {
    providerChain?: string[];
    finalProvider?: string;
    finalModel?: string;
    usedFallback?: boolean;
    stage?: string;
    hadReply?: boolean;
  };
}

function sanitizePhone(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

function localFallbackReply(userText: string, t: (key: string) => string) {
  const q = userText.toLowerCase();

  if (q.includes('price') || q.includes('hind') || q.includes('maksab')) {
    return { text: t('chat.aiPricing'), uncertain: false };
  }
  if (q.includes('time') || q.includes('slot') || q.includes('aeg') || q.includes('vaba')) {
    return { text: t('chat.aiAvailability'), uncertain: false };
  }
  if (q.includes('design') || q.includes('stiil') || q.includes('nail art') || q.includes('kuju')) {
    return { text: t('chat.aiDesign'), uncertain: true };
  }
  if (q.includes('book') || q.includes('broneeri') || q.includes('booking')) {
    return { text: t('chat.aiBookingHelp'), uncertain: false };
  }

  return { text: t('chat.aiFallback'), uncertain: true };
}

export function SmartChatWidget() {
  const pathname = usePathname();
  const { t, language } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isOpeningMessenger, setIsOpeningMessenger] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [debugLine, setDebugLine] = useState<string>('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: 'assistant',
      text: t('chat.aiWelcome'),
    },
  ]);

  const whatsappPhoneRaw = process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? '';
  const whatsappPhone = sanitizePhone(whatsappPhoneRaw);
  const messengerPageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID ?? '';
  const messengerAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? '';
  const messengerUrl = messengerPageId ? `https://m.me/${messengerPageId}` : '';
  const hasMessenger = Boolean(messengerUrl);
  const hasWhatsApp = Boolean(whatsappPhone);
  const hasAnyChannel = hasMessenger || hasWhatsApp;
  const hideOnPath = pathname.startsWith('/admin');

  useEffect(() => {
    setMessages([{ id: createId(), role: 'assistant', text: t('chat.aiWelcome') }]);
  }, [t]);

  useEffect(() => {
    if (hideOnPath || !hasAnyChannel) {
      setIsVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setIsVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, [hideOnPath, hasAnyChannel]);

  useEffect(() => {
    if (!isVisible) setIsOpen(false);
  }, [isVisible]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleOpenMessengerHandoff = async () => {
    if (!messengerPageId) return;
    setIsOpeningMessenger(true);
    await openMessengerHandoff({
      pageId: messengerPageId,
      appId: messengerAppId || undefined,
      fallbackUrl: messengerUrl || undefined,
    });
    setIsOpeningMessenger(false);
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!value || isTyping) return;

    const userMsg: ChatMessage = { id: createId(), role: 'user', text: value };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const conversation = [...messages, userMsg].slice(-8).map((message) => ({
      role: message.role,
      text: message.text,
    }));

    try {
      const response = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: language, messages: conversation }),
      });

      const payload = (await response.json().catch(() => ({}))) as AssistantApiResponse;
      const reply = (payload.reply ?? '').trim();
      const uncertain = Boolean(payload.handoffSuggested);
      const text = reply.length > 0 ? reply : localFallbackReply(value, t).text;
      if (payload.debug) {
        const parts = [
          payload.debug.finalProvider || 'none',
          payload.debug.finalModel || 'none',
          payload.debug.usedFallback ? 'fallback:on' : 'fallback:off',
          payload.debug.hadReply ? 'reply:yes' : 'reply:no',
        ];
        setDebugLine(parts.join(' | '));
      }

      const nextMessages: ChatMessage[] = [{ id: createId(), role: 'assistant', text }];
      if (uncertain && hasMessenger) {
        nextMessages.push({ id: createId(), role: 'assistant', text: t('chat.handoffSuggestion') });
        window.dispatchEvent(
          new CustomEvent('nailify:chat-handoff', {
            detail: { event: 'ai_unable_to_resolve', source: 'assistant_panel', locale: language },
          })
        );
      }
      setMessages((prev) => [...prev, ...nextMessages]);
    } catch (error) {
      console.error('Assistant chat request failed:', error);
      const fallback = localFallbackReply(value, t);
      const nextMessages: ChatMessage[] = [{ id: createId(), role: 'assistant', text: fallback.text }];
      if (fallback.uncertain && hasMessenger) {
        nextMessages.push({ id: createId(), role: 'assistant', text: t('chat.handoffSuggestion') });
      }
      setMessages((prev) => [...prev, ...nextMessages]);
    } finally {
      setIsTyping(false);
    }
  };

  if (hideOnPath || !hasAnyChannel || !isVisible) return null;

  return (
    <>
      {isOpen && (
        <>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={t('chat.closeAria')}
            className="fixed inset-x-0 top-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[44] bg-[#2c1625]/22 md:inset-0 md:bg-[#2c1625]/18"
          />

          <div className="fixed left-3 right-3 top-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[45] md:left-auto md:right-6 md:top-auto md:bottom-24 md:w-[360px]">
            <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#ecdde7] bg-white/96 p-4 shadow-[0_32px_52px_-28px_rgba(97,58,84,0.5)] backdrop-blur-md md:h-auto md:max-h-[min(72vh,640px)]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#b07a99]">{t('chat.title')}</p>
                  <p className="mt-1 text-sm text-[#6f5d6d]">{t('chat.subtitle')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-[#ead8e2] px-3 text-xs font-medium text-[#735a6a] transition hover:bg-[#fff7fb]"
                >
                  {t('chat.close')}
                </button>
              </div>
              {debugLine ? (
                <p className="mt-2 rounded-full border border-[#ecdde7] bg-[#fff7fb] px-2.5 py-1 text-[10px] text-[#8e6a80]">
                  {debugLine}
                </p>
              ) : null}

              <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border border-[#f0e4ea] bg-[#fffafd] p-3 md:max-h-[260px] md:flex-none">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-xl px-3 py-2 text-sm ${message.role === 'assistant' ? 'border border-[#efe2e9] bg-white text-[#5f4a59]' : 'ml-8 border border-[#ead8e2] bg-[#f7edf4] text-[#4a3a45]'}`}
                  >
                    {message.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-[#efe2e9] bg-white px-3 py-2 text-sm text-[#7a6673]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c086a7]" />
                    {t('chat.aiTyping')}
                  </div>
                )}
              </div>

              <form onSubmit={sendMessage} className="mt-3 flex items-center gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder={t('chat.aiPlaceholder')}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-[#e8d9e4] bg-white px-3 text-sm text-[#4d3b47] outline-none focus:border-[#c28aa9]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="h-10 rounded-xl bg-[#c24d86] px-3.5 text-sm font-medium text-white transition hover:bg-[#a93d71] disabled:opacity-50"
                >
                  {t('chat.aiSend')}
                </button>
              </form>

              {hasMessenger && (
                <button
                  type="button"
                  onClick={() => void handleOpenMessengerHandoff()}
                  data-chat-handoff="messenger"
                  disabled={isOpeningMessenger}
                  className="mt-3 w-full rounded-2xl border border-[#e7d6e1] bg-white px-3 py-2.5 text-sm font-medium text-[#664b5d] transition hover:bg-[#fff8fc] disabled:opacity-60"
                >
                  {isOpeningMessenger ? t('chat.openingMessenger') : t('chat.handoffAction')}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {!isOpen && (
        <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] right-5 z-[45] md:bottom-24 md:right-6">
          <button
            onClick={() => setIsOpen(true)}
            aria-expanded={isOpen}
            aria-label={t('chat.triggerAria')}
            className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-full border border-[#e8d3df] bg-[linear-gradient(180deg,#fff8fc_0%,#fff0f7_100%)] text-[#8b5576] shadow-[0_8px_20px_-12px_rgba(118,73,102,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(118,73,102,0.25)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M8 10h8M8 14h5m-7 6l1.8-3.6A9 9 0 1112 21c-1.1 0-2.1-.2-3-.6L6 21z"
              />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

export default SmartChatWidget;
