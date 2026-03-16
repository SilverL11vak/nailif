'use client';

declare global {
  interface Window {
    FB?: {
      init: (params: { appId?: string; xfbml: boolean; version: string }) => void;
      XFBML?: { parse: () => void };
      CustomerChat?: { show: () => void; showDialog: () => void };
    };
    fbAsyncInit?: () => void;
  }
}

type HandoffEvent = 'human_handoff_clicked' | 'human_handoff_opened' | 'human_handoff_failed';

let sdkLoadPromise: Promise<void> | null = null;

function trackHandoff(event: HandoffEvent, payload?: Record<string, string>) {
  if (typeof window === 'undefined') return;
  const detail = { event, ...payload };
  window.dispatchEvent(new CustomEvent('nailify:chat-handoff', { detail }));
}

function ensureRootNode() {
  if (typeof document === 'undefined') return;
  if (!document.getElementById('fb-root')) {
    const root = document.createElement('div');
    root.id = 'fb-root';
    document.body.appendChild(root);
  }
}

function ensureCustomerChatNode(pageId: string) {
  if (typeof document === 'undefined') return;
  let node = document.getElementById('fb-customer-chat');
  if (!node) {
    node = document.createElement('div');
    node.id = 'fb-customer-chat';
    node.className = 'fb-customerchat';
    node.setAttribute('data-attribution', 'biz_inbox');
    document.body.appendChild(node);
  }
  node.setAttribute('data-page_id', pageId);
  node.setAttribute('data-theme_color', '#c24d86');
  node.setAttribute('data-logged_in_greeting', 'Hi! How can we help with your booking?');
  node.setAttribute('data-logged_out_greeting', 'Hi! How can we help with your booking?');
}

async function loadMessengerSdk(appId?: string) {
  if (typeof window === 'undefined') return;
  if (window.FB) return;
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById('facebook-jssdk') as HTMLScriptElement | null;
    const finishInit = () => {
      window.FB?.init({
        appId: appId || undefined,
        xfbml: true,
        version: 'v20.0',
      });
      resolve();
    };

    window.fbAsyncInit = () => {
      finishInit();
    };

    if (existingScript) {
      existingScript.addEventListener('load', finishInit, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Messenger SDK failed to load')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v20.0';
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Messenger SDK failed to load'));
    document.body.appendChild(script);
  }).catch((error) => {
    sdkLoadPromise = null;
    throw error;
  });

  return sdkLoadPromise;
}

interface OpenMessengerOptions {
  pageId: string;
  appId?: string;
  fallbackUrl?: string;
}

export async function openMessengerHandoff({ pageId, appId, fallbackUrl }: OpenMessengerOptions): Promise<boolean> {
  if (!pageId || typeof window === 'undefined' || typeof document === 'undefined') return false;

  trackHandoff('human_handoff_clicked', { pageId });

  try {
    ensureRootNode();
    ensureCustomerChatNode(pageId);
    await loadMessengerSdk(appId);
    window.FB?.XFBML?.parse();
    const chatApi = window.FB?.CustomerChat;
    let opened = false;

    if (chatApi?.showDialog) {
      chatApi.showDialog();
      opened = true;
    } else if (chatApi?.show) {
      chatApi.show();
      opened = true;
    }

    if (!opened) {
      throw new Error('Messenger dialog API unavailable');
    }

    trackHandoff('human_handoff_opened', { pageId });
    return true;
  } catch (error) {
    console.error('Messenger handoff open failed:', error);
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }
    trackHandoff('human_handoff_failed', { pageId });
    return false;
  }
}
