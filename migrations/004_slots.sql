-- 004_slots.sql
-- Time slots table for booking availability

-- Time slots table
CREATE TABLE IF NOT EXISTS time_slots (
    id BIGSERIAL PRIMARY KEY,
    slot_date DATE NOT NULL,
    slot_time TEXT NOT NULL,
    available BOOLEAN DEFAULT true,
    capacity INTEGER DEFAULT 1,
    is_popular BOOLEAN DEFAULT false,
    is_fastest BOOLEAN DEFAULT false,
    is_sos BOOLEAN DEFAULT false,
    sos_surcharge INTEGER,
    sos_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(slot_date, slot_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_date ON time_slots(slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_available ON time_slots(available);
