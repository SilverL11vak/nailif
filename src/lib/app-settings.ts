import 'server-only';
import { sql } from './db';

const ANALYTICS_ENABLED_KEY = 'analytics_enabled';
const DEFAULT_ANALYTICS_ENABLED = '0';

declare global {
  var __nailify_app_settings_ensure__: Promise<void> | undefined;
}

let ensurePromise: Promise<void> | null = global.__nailify_app_settings_ensure__ ?? null;

async function ensureAppSettingsTable(): Promise<void> {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    const row = await sql<[{ count: string }]>`
      SELECT COUNT(*)::text AS count FROM app_settings WHERE key = ${ANALYTICS_ENABLED_KEY}
    `;
    if (Number(row[0]?.count ?? 0) === 0) {
      await sql`
        INSERT INTO app_settings (key, value)
        VALUES (${ANALYTICS_ENABLED_KEY}, ${DEFAULT_ANALYTICS_ENABLED})
        ON CONFLICT (key) DO NOTHING
      `;
    }
    global.__nailify_app_settings_ensure__ = ensurePromise!;
  })();
  return ensurePromise;
}

/**
 * Get a single app setting. Returns empty string if key does not exist.
 * For analytics_enabled, use getAnalyticsEnabled() instead.
 */
export async function getAppSetting(key: string): Promise<string> {
  await ensureAppSettingsTable();
  const rows = await sql<[{ value: string }]>`
    SELECT value FROM app_settings WHERE key = ${key}
  `;
  return rows[0]?.value ?? '';
}

/**
 * Set a single app setting.
 */
export async function setAppSetting(key: string, value: string): Promise<void> {
  await ensureAppSettingsTable();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `;
}

/**
 * Central flag for custom analytics (session/event/slot-click/funnel/behavior).
 * Default is false (OFF). When false, no tracking runs and APIs no-op.
 */
export async function getAnalyticsEnabled(): Promise<boolean> {
  const raw = await getAppSetting(ANALYTICS_ENABLED_KEY);
  return raw === '1' || raw === 'true';
}

/**
 * Enable or disable custom analytics. Persisted in app_settings.
 */
export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  await setAppSetting(ANALYTICS_ENABLED_KEY, enabled ? '1' : '0');
}
