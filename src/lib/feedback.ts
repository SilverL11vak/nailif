import { sql } from './db';

export interface FeedbackItem {
  id: string;
  clientName: string;
  clientAvatarUrl: string | null;
  rating: number;
  feedbackText: string;
  serviceId: string | null;
  sourceLabel: string | null;
  createdAt: string;
  sortOrder: number;
  isVisible: boolean;
}

type FeedbackRow = {
  id: string;
  client_name: string;
  client_avatar_url: string | null;
  rating: number;
  feedback_text: string;
  service_id: string | null;
  source_label: string | null;
  created_at: Date;
  sort_order: number;
  is_visible: boolean;
};

let feedbackEnsurePromise: Promise<void> | null = null;

async function ensureFeedbackTableInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_avatar_url TEXT,
      rating INTEGER NOT NULL DEFAULT 5,
      feedback_text TEXT NOT NULL DEFAULT '',
      service_id TEXT,
      source_label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS client_avatar_url TEXT`;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS service_id TEXT`;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source_label TEXT`;
}

export async function ensureFeedbackTable() {
  if (!feedbackEnsurePromise) {
    feedbackEnsurePromise = ensureFeedbackTableInternal();
  }
  await feedbackEnsurePromise;
}

function rowToItem(row: FeedbackRow): FeedbackItem {
  return {
    id: row.id,
    clientName: row.client_name,
    clientAvatarUrl: row.client_avatar_url ?? null,
    rating: row.rating,
    feedbackText: row.feedback_text,
    serviceId: row.service_id ?? null,
    sourceLabel: row.source_label ?? null,
    createdAt: row.created_at.toISOString(),
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
  };
}

export async function listFeedback(visibleOnly = false): Promise<FeedbackItem[]> {
  await ensureFeedbackTable();
  const rows = await sql<FeedbackRow[]>`
    SELECT id, client_name, client_avatar_url, rating, feedback_text, service_id, source_label, created_at, sort_order, is_visible
    FROM feedback
    ${visibleOnly ? sql`WHERE is_visible = TRUE` : sql``}
    ORDER BY sort_order ASC, created_at DESC
  `;
  return rows.map(rowToItem);
}

export async function getFeedbackById(id: string): Promise<FeedbackItem | null> {
  await ensureFeedbackTable();
  const [row] = await sql<FeedbackRow[]>`
    SELECT id, client_name, client_avatar_url, rating, feedback_text, service_id, source_label, created_at, sort_order, is_visible
    FROM feedback
    WHERE id = ${id}
  `;
  return row ? rowToItem(row) : null;
}

export async function upsertFeedback(item: {
  id: string;
  clientName: string;
  clientAvatarUrl?: string | null;
  rating?: number;
  feedbackText: string;
  serviceId?: string | null;
  sourceLabel?: string | null;
  sortOrder?: number;
  isVisible?: boolean;
}): Promise<void> {
  await ensureFeedbackTable();
  await sql`
    INSERT INTO feedback (id, client_name, client_avatar_url, rating, feedback_text, service_id, source_label, sort_order, is_visible)
    VALUES (
      ${item.id},
      ${item.clientName.trim()},
      ${item.clientAvatarUrl?.trim() || null},
      ${Math.min(5, Math.max(1, Number(item.rating) || 5))},
      ${item.feedbackText.trim() || ''},
      ${item.serviceId?.trim() || null},
      ${item.sourceLabel?.trim() || null},
      ${Number(item.sortOrder) ?? 0},
      ${item.isVisible !== false}
    )
    ON CONFLICT (id) DO UPDATE SET
      client_name = EXCLUDED.client_name,
      client_avatar_url = EXCLUDED.client_avatar_url,
      rating = EXCLUDED.rating,
      feedback_text = EXCLUDED.feedback_text,
      service_id = EXCLUDED.service_id,
      source_label = EXCLUDED.source_label,
      sort_order = EXCLUDED.sort_order,
      is_visible = EXCLUDED.is_visible
  `;
}

export async function deleteFeedback(id: string): Promise<void> {
  await ensureFeedbackTable();
  await sql`DELETE FROM feedback WHERE id = ${id}`;
}

export async function setFeedbackVisibility(id: string, isVisible: boolean): Promise<void> {
  await ensureFeedbackTable();
  await sql`UPDATE feedback SET is_visible = ${isVisible} WHERE id = ${id}`;
}

export async function updateFeedbackSortOrder(id: string, sortOrder: number): Promise<void> {
  await ensureFeedbackTable();
  await sql`UPDATE feedback SET sort_order = ${sortOrder} WHERE id = ${id}`;
}
