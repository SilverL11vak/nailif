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
    <div className="fixed bottom-[6.2rem] right-4 z-[45] md:bottom-24 md:right-6">
      {isOpen && (
        <div className="mb-3 w-[320px] overflow-hidden rounded-3xl border border-[#ecdde7] bg-white/95 p-4 shadow-[0_28px_46px_-30px_rgba(97,58,84,0.45)] backdrop-blur-md">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#b07a99]">{t('chat.title')}</p>
          <p className="mt-1 text-sm text-[#6f5d6d]">{t('chat.subtitle')}</p>

          <div className="mt-3 max-h-[260px] space-y-2 overflow-y-auto rounded-2xl border border-[#f0e4ea] bg-[#fffafd] p-3">
            {messages.map((message) => (
              <div key={message.id} className={`rounded-xl px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-white text-[#5f4a59] border border-[#efe2e9]' : 'ml-8 bg-[#f7edf4] text-[#4a3a45] border border-[#ead8e2]'}`}>
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
      )}

      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={t('chat.triggerAria')}
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#e8d3df] bg-[linear-gradient(180deg,#fff8fc_0%,#fff0f7_100%)] text-[#8b5576] shadow-[0_22px_30px_-22px_rgba(118,73,102,0.52)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_34px_-20px_rgba(118,73,102,0.58)]"
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
  );
}

export default SmartChatWidget;
