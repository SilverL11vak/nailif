/**
 * Client-side only. Set by root layout script from server (app_settings.analytics_enabled).
 * When false, all custom analytics (session/events/slot-clicks/funnel/behavior) must not run.
 */
export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as unknown as { __ANALYTICS_ENABLED__?: boolean }).__ANALYTICS_ENABLED__ === true;
}
