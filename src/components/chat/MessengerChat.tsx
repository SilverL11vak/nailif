'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    FB?: {
      init: (params: {
        appId?: string;
        xfbml: boolean;
        version: string;
      }) => void;
      XFBML?: {
        parse: () => void;
      };
      CustomerChat?: {
        show: () => void;
        showDialog: () => void;
      };
    };
    fbAsyncInit?: () => void;
  }
}

export function MessengerChat() {
  const pageId = process.env.NEXT_PUBLIC_FACEBOOK_PAGE_ID;
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    if (!pageId) return;

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId: appId || undefined,
        xfbml: true,
        version: 'v20.0',
      });
      window.FB?.XFBML?.parse();
    };
  }, [appId, pageId]);

  useEffect(() => {
    if (!pageId || !scriptReady) return;
    window.FB?.XFBML?.parse();
  }, [pageId, scriptReady]);

  if (!pageId) return null;

  return (
    <>
      <div id="fb-root" />
      <div
        id="fb-customer-chat"
        className="fb-customerchat"
        data-attribution="biz_inbox"
        data-page_id={pageId}
        data-theme_color="#c24d86"
        data-logged_in_greeting="Hi! How can we help with your booking?"
        data-logged_out_greeting="Hi! How can we help with your booking?"
      />
      <Script
        id="facebook-jssdk"
        src="https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v20.0"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />
      {scriptFailed && (
        <a
          href={`https://m.me/${pageId}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-[120px] right-4 z-[70] rounded-full bg-[#c24d86] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_28px_-18px_rgba(141,60,108,0.6)] transition-colors hover:bg-[#a93d71] md:bottom-6"
        >
          Chat in Messenger
        </a>
      )}
    </>
  );
}

export default MessengerChat;
