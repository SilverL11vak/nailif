import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';

export interface LocalizedValue {
  et: string;
  en: string;
}

export interface FeedbackItem {
  id: string;
  clientName: string;
  clientAvatarUrl: string | null;
  rating: number;
  feedbackText: LocalizedValue;
  serviceId: string | null;
  sourceLabel: LocalizedValue;
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
  feedback_text_et: string;
  feedback_text_en: string;
  service_id: string | null;
  source_label: string | null;
  source_label_et: string;
  source_label_en: string;
  created_at: Date;
  sort_order: number;
  is_visible: boolean;
};

let feedbackEnsurePromise: Promise<void> | null = null;

function asText(input: unknown): string {
  return typeof input === 'string' ? input.trim() : '';
}

function asLocalized(input: unknown, fallback = ''): LocalizedValue {
  if (typeof input === 'string') {
    const value = input.trim();
    return { et: value, en: value };
  }
  if (input && typeof input === 'object') {
    const candidate = input as Partial<Record<'et' | 'en', unknown>>;
    const et = asText(candidate.et) || fallback;
    const en = asText(candidate.en) || fallback;
    return { et, en };
  }
  return { et: fallback, en: fallback };
}

export function localizedFeedbackText(value: LocalizedValue, locale: string): string {
  return locale === 'en' ? value.en : value.et;
}

async function ensureFeedbackTableInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      client_name TEXT NOT NULL,
      client_avatar_url TEXT,
      rating INTEGER NOT NULL DEFAULT 5,
      feedback_text TEXT NOT NULL DEFAULT '',
      feedback_text_et TEXT NOT NULL DEFAULT '',
      feedback_text_en TEXT NOT NULL DEFAULT '',
      service_id TEXT,
      source_label TEXT,
      source_label_et TEXT NOT NULL DEFAULT '',
      source_label_en TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS client_avatar_url TEXT`;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS service_id TEXT`;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source_label TEXT`;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feedback_text_et TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS feedback_text_en TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source_label_et TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS source_label_en TEXT NOT NULL DEFAULT ''`;

  await sql`
    UPDATE feedback
    SET
      feedback_text_et = COALESCE(NULLIF(feedback_text_et, ''), feedback_text),
      feedback_text_en = COALESCE(NULLIF(feedback_text_en, ''), feedback_text),
      source_label_et = COALESCE(NULLIF(source_label_et, ''), source_label, ''),
      source_label_en = COALESCE(NULLIF(source_label_en, ''), source_label, '')
  `;
}

export async function ensureFeedbackTable() {
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) return;
  }

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
    feedbackText: asLocalized({ et: row.feedback_text_et, en: row.feedback_text_en }, row.feedback_text),
    serviceId: row.service_id ?? null,
    sourceLabel: asLocalized({ et: row.source_label_et, en: row.source_label_en }, row.source_label ?? ''),
    createdAt: row.created_at.toISOString(),
    sortOrder: row.sort_order,
    isVisible: row.is_visible,
  };
}

export async function listFeedback(visibleOnly = false): Promise<FeedbackItem[]> {
  await ensureFeedbackTable();
  const rows = await sql<FeedbackRow[]>`
    SELECT id, client_name, client_avatar_url, rating, feedback_text, feedback_text_et, feedback_text_en, service_id, source_label, source_label_et, source_label_en, created_at, sort_order, is_visible
    FROM feedback
    ${visibleOnly ? sql`WHERE is_visible = TRUE` : sql``}
    ORDER BY sort_order ASC, created_at DESC
  `;
  return rows.map(rowToItem);
}

export async function upsertFeedback(item: {
  id: string;
  clientName: string;
  clientAvatarUrl?: string | null;
  rating?: number;
  feedbackText: LocalizedValue | string;
  serviceId?: string | null;
  sourceLabel?: LocalizedValue | string | null;
  sortOrder?: number;
  isVisible?: boolean;
}): Promise<void> {
  await ensureFeedbackTable();
  const feedbackText = asLocalized(item.feedbackText);
  const sourceLabel = asLocalized(item.sourceLabel ?? '');

  await sql`
    INSERT INTO feedback (
      id, client_name, client_avatar_url, rating, feedback_text, feedback_text_et, feedback_text_en,
      service_id, source_label, source_label_et, source_label_en, sort_order, is_visible
    )
    VALUES (
      ${item.id},
      ${item.clientName.trim()},
      ${item.clientAvatarUrl?.trim() || null},
      ${Math.min(5, Math.max(1, Number(item.rating) || 5))},
      ${feedbackText.et},
      ${feedbackText.et},
      ${feedbackText.en},
      ${item.serviceId?.trim() || null},
      ${sourceLabel.et || null},
      ${sourceLabel.et},
      ${sourceLabel.en},
      ${Number(item.sortOrder) ?? 0},
      ${item.isVisible !== false}
    )
    ON CONFLICT (id) DO UPDATE SET
      client_name = EXCLUDED.client_name,
      client_avatar_url = EXCLUDED.client_avatar_url,
      rating = EXCLUDED.rating,
      feedback_text = EXCLUDED.feedback_text,
      feedback_text_et = EXCLUDED.feedback_text_et,
      feedback_text_en = EXCLUDED.feedback_text_en,
      service_id = EXCLUDED.service_id,
      source_label = EXCLUDED.source_label,
      source_label_et = EXCLUDED.source_label_et,
      source_label_en = EXCLUDED.source_label_en,
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

