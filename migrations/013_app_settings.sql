-- 013_app_settings.sql
-- App-level settings (e.g. analytics feature flag). Default: analytics OFF.

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO app_settings (key, value)
VALUES ('analytics_enabled', '0')
ON CONFLICT (key) DO NOTHING;
