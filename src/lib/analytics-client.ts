export type BookingAnalyticsEventType =
  | 'booking_open'
  | 'booking_service_selected'
  | 'booking_slot_selected'
  | 'booking_details_started'
  | 'booking_payment_start'
  | 'booking_success'
  | 'booking_payment_fail'
  | 'booking_abandon';

import { isAnalyticsEnabled } from '@/lib/analytics-enabled';

const SESSION_KEY = 'booking_analytics_session_id';
const SUCCESS_KEY = 'booking_analytics_success';
const LAST_STEP_KEY = 'booking_analytics_last_step';
const LAST_ACTIVITY_KEY = 'booking_analytics_last_activity';

const MIN_EVENT_INTERVAL_MS = 700;
const lastEventAt: Partial<Record<BookingAnalyticsEventType, number>> = {};
const lastSlotClickAt: Record<string, number> = {};

function safeNow() {
  return typeof Date !== 'undefined' ? Date.now() : 0;
}

function tryUuid(): string {
  try {
    // modern browsers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = (globalThis as any).crypto;
    if (c?.randomUUID) return c.randomUUID();
  } catch {
    // ignore
  }
  // fallback: not cryptographically strong, but sufficient for session correlation
  return `sess_${Math.random().toString(16).slice(2)}_${safeNow().toString(16)}`;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeLocalStorageRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function sendNonBlocking(url: string, data: unknown) {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(data ?? {});
    const blob = new Blob([payload], { type: 'application/json' });
    if (navigator?.sendBeacon) {
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => null);
  } catch {
    // ignore
  }
}

export function getOrCreateBookingSessionId(): string {
  const existing = safeLocalStorageGet(SESSION_KEY);
  if (existing && existing.length >= 8) return existing;
  const id = tryUuid();
  safeLocalStorageSet(SESSION_KEY, id);
  return id;
}

export function markBookingSuccessForSession() {
  safeLocalStorageSet(SUCCESS_KEY, '1');
}

export function clearBookingSession() {
  safeLocalStorageRemove(SESSION_KEY);
  safeLocalStorageRemove(SUCCESS_KEY);
  safeLocalStorageRemove(LAST_STEP_KEY);
  safeLocalStorageRemove(LAST_ACTIVITY_KEY);
}

export function setLastFunnelStep(step: number) {
  safeLocalStorageSet(LAST_STEP_KEY, String(step));
}

export function touchBookingActivity() {
  safeLocalStorageSet(LAST_ACTIVITY_KEY, String(safeNow()));
}

export function getLastFunnelStep(): number | null {
  const raw = safeLocalStorageGet(LAST_STEP_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function hasBookingSuccess(): boolean {
  return safeLocalStorageGet(SUCCESS_KEY) === '1';
}

export function trackSessionStart(input: { locale?: string; path?: string; referrer?: string }) {
  if (!isAnalyticsEnabled()) return;
  const sessionId = getOrCreateBookingSessionId();
  sendNonBlocking('/api/analytics/session-start', { sessionId, ...input });
}

export function trackEvent(input: {
  eventType: BookingAnalyticsEventType;
  step?: number;
  serviceId?: string;
  slotId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!isAnalyticsEnabled()) return;
  const sessionId = getOrCreateBookingSessionId();
  const now = safeNow();
  const last = lastEventAt[input.eventType] ?? 0;
  if (now - last < MIN_EVENT_INTERVAL_MS) return;
  lastEventAt[input.eventType] = now;

  sendNonBlocking('/api/analytics/event', {
    sessionId,
    eventType: input.eventType,
    step: typeof input.step === 'number' ? input.step : undefined,
    serviceId: input.serviceId,
    slotId: input.slotId,
    metadata: input.metadata,
  });
}

export function trackSlotClick(slotId: string) {
  if (!isAnalyticsEnabled()) return;
  const sessionId = getOrCreateBookingSessionId();
  const now = safeNow();
  const last = lastSlotClickAt[slotId] ?? 0;
  if (now - last < 500) return;
  lastSlotClickAt[slotId] = now;
  sendNonBlocking('/api/analytics/slot-click', { sessionId, slotId });
}

