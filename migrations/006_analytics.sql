-- 006_analytics.sql
-- Analytics and funnel events tables

-- Analytics sessions
CREATE TABLE IF NOT EXISTS booking_analytics_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    end_reason TEXT,
    locale TEXT,
    path TEXT,
    user_agent TEXT,
    referrer TEXT
);

-- Analytics events
CREATE TABLE IF NOT EXISTS booking_analytics_events (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES booking_analytics_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    step INTEGER,
    service_id TEXT,
    slot_id TEXT,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_analytics_session ON booking_analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON booking_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON booking_analytics_events(created_at);

-- Slot click tracking
CREATE TABLE IF NOT EXISTS booking_analytics_slot_clicks (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES booking_analytics_sessions(id) ON DELETE CASCADE,
    slot_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    converted BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_slot_clicks_session ON booking_analytics_slot_clicks(session_id);
CREATE INDEX IF NOT EXISTS idx_slot_clicks_slot ON booking_analytics_slot_clicks(slot_id);

-- Funnel events
CREATE TABLE IF NOT EXISTS booking_funnel_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    user_id TEXT,
    session_id UUID REFERENCES booking_analytics_sessions(id) ON DELETE SET NULL,
    step TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funnel_type ON booking_funnel_events(event_type);
CREATE INDEX IF NOT EXISTS idx_funnel_created ON booking_funnel_events(created_at);
