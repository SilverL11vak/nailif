import { sql } from '@/lib/db';

export type AnalyticsEventType =
  | 'booking_open'
  | 'booking_service_selected'
  | 'booking_slot_selected'
  | 'booking_details_started'
  | 'booking_payment_start'
  | 'booking_success'
  | 'booking_payment_fail'
  | 'booking_abandon';

export async function ensureAnalyticsTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS booking_analytics_sessions (
      id uuid PRIMARY KEY,
      started_at timestamptz NOT NULL DEFAULT now(),
      ended_at timestamptz NULL,
      end_reason text NULL,
      locale text NULL,
      path text NULL,
      user_agent text NULL,
      referrer text NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS booking_analytics_events (
      id bigserial PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES booking_analytics_sessions(id) ON DELETE CASCADE,
      event_type text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      step int NULL,
      service_id text NULL,
      slot_id text NULL,
      metadata jsonb NULL
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS booking_analytics_events_session_id_idx
      ON booking_analytics_events(session_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS booking_analytics_events_type_idx
      ON booking_analytics_events(event_type);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS booking_analytics_slot_clicks (
      id bigserial PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES booking_analytics_sessions(id) ON DELETE CASCADE,
      slot_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      converted boolean NOT NULL DEFAULT false
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS booking_analytics_slot_clicks_session_idx
      ON booking_analytics_slot_clicks(session_id);
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS booking_analytics_slot_clicks_slot_idx
      ON booking_analytics_slot_clicks(slot_id);
  `;
}

export async function insertAnalyticsSessionStart(input: {
  sessionId: string;
  locale?: string | null;
  path?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}) {
  await ensureAnalyticsTables();
  await sql`
    INSERT INTO booking_analytics_sessions (id, locale, path, user_agent, referrer)
    VALUES (${input.sessionId}::uuid, ${input.locale ?? null}, ${input.path ?? null}, ${input.userAgent ?? null}, ${
      input.referrer ?? null
    })
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function endAnalyticsSession(input: { sessionId: string; reason: string }) {
  await ensureAnalyticsTables();
  await sql`
    UPDATE booking_analytics_sessions
    SET ended_at = COALESCE(ended_at, now()),
        end_reason = COALESCE(end_reason, ${input.reason})
    WHERE id = ${input.sessionId}::uuid
  `;
}

export async function insertAnalyticsEvent(input: {
  sessionId: string;
  eventType: AnalyticsEventType;
  step?: number | null;
  serviceId?: string | null;
  slotId?: string | null;
  metadata?: unknown | null;
}) {
  await ensureAnalyticsTables();
  const metadataJson = input.metadata == null ? null : JSON.stringify(input.metadata);
  await sql`
    INSERT INTO booking_analytics_events (session_id, event_type, step, service_id, slot_id, metadata)
    VALUES (${input.sessionId}::uuid, ${input.eventType}, ${input.step ?? null}, ${input.serviceId ?? null}, ${
      input.slotId ?? null
    }, ${metadataJson}::jsonb)
  `;
}

export async function insertSlotClick(input: { sessionId: string; slotId: string }) {
  await ensureAnalyticsTables();
  await sql`
    INSERT INTO booking_analytics_slot_clicks (session_id, slot_id)
    VALUES (${input.sessionId}::uuid, ${input.slotId})
  `;
}

export async function markSlotClicksConverted(input: { sessionId: string }) {
  await ensureAnalyticsTables();
  await sql`
    UPDATE booking_analytics_slot_clicks
    SET converted = true
    WHERE session_id = ${input.sessionId}::uuid
  `;
}

