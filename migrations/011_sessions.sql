-- 011_sessions.sql
-- Anonymous session storage for favorites, cart, and booking progress
-- Enables cross-device persistence without user accounts

-- Session tracking table
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON user_sessions(last_activity_at);

-- Session data table (favorites, cart, booking_progress)
CREATE TABLE IF NOT EXISTS session_data (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    data_type TEXT NOT NULL CHECK (data_type IN ('favorites', 'cart', 'booking_progress')),
    data_key TEXT NOT NULL DEFAULT '',
    data_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, data_type, data_key)
);

CREATE INDEX IF NOT EXISTS idx_session_data_session ON session_data(session_id);
CREATE INDEX IF NOT EXISTS idx_session_data_type ON session_data(data_type);

-- Seed initial session (will be created on first use)
-- No seed data needed - sessions are created dynamically
