// Homepage section content management
// Provides DB-backed content with JSON fallback support

import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';
import type { LocaleCode } from './i18n/locale-path';
import { getTranslation } from './i18n/translations';

// Type definitions
export interface HomepageSection {
  id: string;
  sectionGroup: string;
  sortOrder: number;
  isActive: boolean;
  valueEt: string;
  valueEn: string;
  updatedAt: string;
}

// Singleton for ensuring table exists
let homepageContentEnsurePromise: Promise<void> | null = null;

declare global {
  var __nailify_homepage_content_ensure__: Promise<void> | undefined;
}

async function ensureHomepageContentTablesInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS homepage_sections (
      id TEXT PRIMARY KEY,
      section_group TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      value_et TEXT NOT NULL DEFAULT '',
      value_en TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  
  await sql`CREATE INDEX IF NOT EXISTS idx_homepage_sections_group ON homepage_sections(section_group);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_homepage_sections_active ON homepage_sections(is_active);`;
}

export async function ensureHomepageContentTables() {
  // Skip in production if migrations have been run
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  if (homepageContentEnsurePromise) {
    await homepageContentEnsurePromise;
    return;
  }

  homepageContentEnsurePromise = ensureHomepageContentTablesInternal();
  global.__nailify_homepage_content_ensure__ = homepageContentEnsurePromise;
  await homepageContentEnsurePromise;
}

// Helper to get localized value
function localize(locale: LocaleCode, et: string, en: string): string {
  return locale === 'et' ? et : en;
}

// Get content with DB-first-then-JSON-fallback
// This is the main helper for use in components
export function getHomepageContent(
  sections: Record<string, string>,
  key: string,
  locale: LocaleCode,
  jsonFallbackKey?: string
): string {
  // 1. Try DB content
  if (sections[key]) {
    return sections[key];
  }
  
  // 2. Fall back to JSON translation
  if (jsonFallbackKey) {
    return getTranslation(locale, jsonFallbackKey);
  }
  
  // 3. Return empty string (caller handles)
  return '';
}

// Get single section by ID with fallback to JSON translation
export async function getHomepageSection(key: string, locale: LocaleCode): Promise<string> {
  // Try DB first
  const rows = await sql<{ id: string; value_et: string; value_en: string }[]>`
    SELECT id, value_et, value_en 
    FROM homepage_sections 
    WHERE id = ${key} AND is_active = TRUE
  `;
  
  if (rows.length > 0) {
    const row = rows[0];
    if (row.value_et || row.value_en) {
      return localize(locale, row.value_et, row.value_en);
    }
  }
  
  // Return empty string - let caller handle fallback to JSON
  return '';
}

// Get all sections for a group
export async function listHomepageSectionsByGroup(sectionGroup: string): Promise<HomepageSection[]> {
  const rows = await sql<{
    id: string;
    section_group: string;
    sort_order: number;
    is_active: boolean;
    value_et: string;
    value_en: string;
    updated_at: string;
  }[]>`
    SELECT id, section_group, sort_order, is_active, value_et, value_en, updated_at
    FROM homepage_sections
    WHERE section_group = ${sectionGroup} AND is_active = TRUE
    ORDER BY sort_order ASC
  `;

  return rows.map(row => ({
    id: row.id,
    sectionGroup: row.section_group,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    valueEt: row.value_et,
    valueEn: row.value_en,
    updatedAt: row.updated_at,
  }));
}

// Get all sections as a record for easier lookup
export async function getHomepageSectionsAll(locale: LocaleCode): Promise<Record<string, string>> {
  try {
    await ensureHomepageContentTables();
    
    const rows = await sql<{ id: string; value_et: string; value_en: string }[]>`
      SELECT id, value_et, value_en
      FROM homepage_sections
      WHERE is_active = TRUE
    `;

    const result: Record<string, string> = {};
    for (const row of rows) {
      if (row.value_et || row.value_en) {
        result[row.id] = localize(locale, row.value_et, row.value_en);
      }
    }
    return result;
  } catch (error) {
    // Table doesn't exist yet - return empty, fallback to JSON
    console.warn('homepage_sections table not available, using JSON fallback:', error);
    return {};
  }
}

// Admin functions

export async function listAdminHomepageSections(): Promise<HomepageSection[]> {
  const rows = await sql<{
    id: string;
    section_group: string;
    sort_order: number;
    is_active: boolean;
    value_et: string;
    value_en: string;
    updated_at: string;
  }[]>`
    SELECT id, section_group, sort_order, is_active, value_et, value_en, updated_at
    FROM homepage_sections
    ORDER BY section_group ASC, sort_order ASC
  `;

  return rows.map(row => ({
    id: row.id,
    sectionGroup: row.section_group,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    valueEt: row.value_et,
    valueEn: row.value_en,
    updatedAt: row.updated_at,
  }));
}

export async function upsertHomepageSection(entry: {
  id: string;
  sectionGroup: string;
  sortOrder?: number;
  isActive?: boolean;
  valueEt: string;
  valueEn: string;
}) {
  await sql`
    INSERT INTO homepage_sections (id, section_group, sort_order, is_active, value_et, value_en, updated_at)
    VALUES (
      ${entry.id}, 
      ${entry.sectionGroup}, 
      ${entry.sortOrder ?? 0}, 
      ${entry.isActive ?? true}, 
      ${entry.valueEt}, 
      ${entry.valueEn},
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      section_group = EXCLUDED.section_group,
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      value_et = EXCLUDED.value_et,
      value_en = EXCLUDED.value_en,
      updated_at = NOW()
  `;
}

export async function deleteHomepageSection(id: string) {
  await sql`DELETE FROM homepage_sections WHERE id = ${id}`;
}
