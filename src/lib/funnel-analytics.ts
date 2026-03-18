import { sql } from '@/lib/db';
import { isDatabaseMigrated } from './schema-validator';

export type FunnelEventName =
  | 'booking_cta_click'
  | 'service_selected'
  | 'slot_viewed'
  | 'slot_clicked'
  | 'slot_abandoned'
  | 'payment_started'
  | 'payment_success';

export async function ensureBookingFunnelEventsTable() {
  // TRANSITIONAL: Skip ensure in production if migrations have been run
  // TODO: After migrations are fully deployed and verified, remove this function
  // and rely entirely on migrations in migrations/006_analytics.sql
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  await sql`
    CREATE TABLE IF NOT EXISTS booking_funnel_events (
      id uuid PRIMARY KEY,
      event_name text NOT NULL,
      booking_id text NULL,
      service_id text NULL,
      slot_id text NULL,
      device text NULL,
      language text NULL,
      metadata jsonb NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS booking_funnel_events_created_at_idx
      ON booking_funnel_events(created_at);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS booking_funnel_events_event_name_idx
      ON booking_funnel_events(event_name);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS booking_funnel_events_service_id_idx
      ON booking_funnel_events(service_id);
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS booking_funnel_events_slot_id_idx
      ON booking_funnel_events(slot_id);
  `;
}

export async function insertFunnelEvent(input: {
  eventName: FunnelEventName;
  bookingId?: string | null;
  serviceId?: string | null;
  slotId?: string | null;
  device?: string | null;
  language?: string | null;
  metadata?: unknown | null;
}) {
  await ensureBookingFunnelEventsTable();
  const id = crypto.randomUUID();
  const metadataJson = input.metadata == null ? null : JSON.stringify(input.metadata);
  await sql`
    INSERT INTO booking_funnel_events (
      id,
      event_name,
      booking_id,
      service_id,
      slot_id,
      device,
      language,
      metadata
    )
    VALUES (
      ${id}::uuid,
      ${input.eventName},
      ${input.bookingId ?? null},
      ${input.serviceId ?? null},
      ${input.slotId ?? null},
      ${input.device ?? null},
      ${input.language ?? null},
      ${metadataJson}::jsonb
    )
  `;
}

