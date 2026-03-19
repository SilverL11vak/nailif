import type { FunnelEventName } from '@/lib/funnel-analytics';

function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as unknown as { __ANALYTICS_ENABLED__?: boolean }).__ANALYTICS_ENABLED__ === true;
}

function deviceType() {
  try {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = ua.includes('mobi') || ua.includes('iphone') || ua.includes('android') || ua.includes('ipad');
    return isMobile ? 'mobile' : 'desktop';
  } catch {
    return 'unknown';
  }
}

function sendNonBlocking(data: unknown) {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(data ?? {});
    const blob = new Blob([payload], { type: 'application/json' });
    if (navigator?.sendBeacon) {
      const ok = navigator.sendBeacon('/api/funnel-event', blob);
      if (ok) return;
    }
    void fetch('/api/funnel-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => null);
  } catch {
    // ignore
  }
}

export function trackEvent(input: {
  event: FunnelEventName;
  bookingId?: string;
  serviceId?: string;
  slotId?: string;
  metadata?: Record<string, unknown>;
  language?: string;
}) {
  if (!isAnalyticsEnabled()) return;
  sendNonBlocking({
    event: input.event,
    bookingId: input.bookingId,
    serviceId: input.serviceId,
    slotId: input.slotId,
    device: deviceType(),
    language: input.language,
    metadata: {
      ...(input.metadata ?? {}),
      ts: Date.now(),
    },
  });
}

