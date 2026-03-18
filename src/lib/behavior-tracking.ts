'use client';

export type BehavioralAnalyticsDevice = 'mobile' | 'desktop';

export type BehavioralAnalyticsEvent = {
  event: string;
  timestamp: number;
  sessionId: string;
  device: BehavioralAnalyticsDevice;
  page: string;
  step?: number;
  serviceId?: string;
  slotId?: string;
  productId?: string;
  value?: number;
  metadata?: Record<string, unknown>;
} & Record<string, unknown>;

const BEHAVIOR_SESSION_KEY = 'nailify_behavior_session_id';

function getDeviceType(): BehavioralAnalyticsDevice {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = (navigator.userAgent ?? '').toLowerCase();
  if (ua.includes('mobi') || ua.includes('iphone') || ua.includes('android') || ua.includes('ipad')) return 'mobile';
  return 'desktop';
}

function safeUuid(): string {
  try {
    const c = globalThis.crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // ignore
  }
  return `sess_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function getOrCreateBehaviorSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = localStorage.getItem(BEHAVIOR_SESSION_KEY);
    if (existing && existing.length >= 8) return existing;
    const id = safeUuid();
    localStorage.setItem(BEHAVIOR_SESSION_KEY, id);
    return id;
  } catch {
    return safeUuid();
  }
}

/**
 * Fire-and-forget behavioural event tracker.
 * - Does NOT block UI rendering
 * - Client only (no-ops on server)
 * - Console logs for now (backend can be added later)
 */
export function trackEvent(eventName: string, payload?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  const base: BehavioralAnalyticsEvent = {
    event: eventName,
    timestamp: Date.now(),
    sessionId: getOrCreateBehaviorSessionId(),
    device: getDeviceType(),
    page: window.location?.pathname ?? '',
  };

  const merged = { ...base, ...(payload ?? {}) } satisfies BehavioralAnalyticsEvent;

  const emit = () => {
    try {
      // eslint-disable-next-line no-console
      console.log('[analytics]', merged);
    } catch {
      // ignore
    }
  };

  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) {
    ric(emit, { timeout: 800 });
    return;
  }
  window.setTimeout(emit, 0);
}

