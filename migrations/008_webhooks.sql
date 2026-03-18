-- 008_webhooks.sql
-- Stripe webhook events table

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON stripe_webhook_events(processed);
