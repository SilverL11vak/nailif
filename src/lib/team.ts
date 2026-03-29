import type { LocaleCode } from '@/lib/i18n/locale-path';
import { sql } from './db';

export interface LocalizedValue {
  et: string;
  en: string;
}

export interface LocalizedListValue {
  et: string[];
  en: string[];
}

export interface TeamMember {
  id: string;
  slug: string;
  fullName: LocalizedValue;
  roleTitle: LocalizedValue;
  shortIntro: LocalizedValue;
  mainImage: string;
  badge1Text: LocalizedValue;
  badge2Text: LocalizedValue;
  badge3Text: LocalizedValue;
  feature1Title: LocalizedValue;
  feature1Text: LocalizedValue;
  feature2Title: LocalizedValue;
  feature2Text: LocalizedValue;
  feature3Title: LocalizedValue;
  feature3Text: LocalizedValue;
  signatureLabel: LocalizedValue;
  signatureTags: LocalizedListValue;
  previewGalleryImages: string[];
  primaryCtaText: LocalizedValue;
  primaryCtaLink: string;
  availabilityHelperText: LocalizedValue;
  isVisible: boolean;
  showOnHomepage: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type TeamMemberInput = Partial<{
  id: string;
  slug: string;
  fullName: LocalizedValue | string;
  roleTitle: LocalizedValue | string;
  shortIntro: LocalizedValue | string;
  mainImage: string;
  badge1Text: LocalizedValue | string;
  badge2Text: LocalizedValue | string;
  badge3Text: LocalizedValue | string;
  feature1Title: LocalizedValue | string;
  feature1Text: LocalizedValue | string;
  feature2Title: LocalizedValue | string;
  feature2Text: LocalizedValue | string;
  feature3Title: LocalizedValue | string;
  feature3Text: LocalizedValue | string;
  signatureLabel: LocalizedValue | string;
  signatureTags: LocalizedListValue | string[];
  previewGalleryImages: string[];
  primaryCtaText: LocalizedValue | string;
  primaryCtaLink: string;
  availabilityHelperText: LocalizedValue | string;
  isVisible: boolean;
  showOnHomepage: boolean;
  isFeatured: boolean;
  sortOrder: number;
}>;

type TeamRow = {
  id: number;
  slug: string;
  full_name: string;
  full_name_et: string;
  full_name_en: string;
  role_title: string;
  role_title_et: string;
  role_title_en: string;
  short_intro: string;
  short_intro_et: string;
  short_intro_en: string;
  main_image: string;
  badge_1_text: string;
  badge_1_text_et: string;
  badge_1_text_en: string;
  badge_2_text: string;
  badge_2_text_et: string;
  badge_2_text_en: string;
  badge_3_text: string;
  badge_3_text_et: string;
  badge_3_text_en: string;
  feature_1_title: string;
  feature_1_title_et: string;
  feature_1_title_en: string;
  feature_1_text: string;
  feature_1_text_et: string;
  feature_1_text_en: string;
  feature_2_title: string;
  feature_2_title_et: string;
  feature_2_title_en: string;
  feature_2_text: string;
  feature_2_text_et: string;
  feature_2_text_en: string;
  feature_3_title: string;
  feature_3_title_et: string;
  feature_3_title_en: string;
  feature_3_text: string;
  feature_3_text_et: string;
  feature_3_text_en: string;
  signature_label: string;
  signature_label_et: string;
  signature_label_en: string;
  signature_tags: unknown;
  signature_tags_et: unknown;
  signature_tags_en: unknown;
  preview_gallery_images: unknown;
  primary_cta_text: string;
  primary_cta_text_et: string;
  primary_cta_text_en: string;
  primary_cta_link: string;
  availability_helper_text: string;
  availability_helper_text_et: string;
  availability_helper_text_en: string;
  is_visible: boolean;
  show_on_homepage: boolean;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

declare global {
  var __nailify_team_ensure__: Promise<void> | undefined;
}

let teamEnsurePromise: Promise<void> | null = global.__nailify_team_ensure__ ?? null;

function normalizeLocale(locale?: string): LocaleCode {
  return locale === 'en' ? 'en' : 'et';
}

function asText(input: unknown): string {
  return typeof input === 'string' ? input.trim() : '';
}

function asTextList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

function asLocalized(input: unknown, legacy = ''): LocalizedValue {
  if (typeof input === 'string') {
    const value = input.trim();
    return { et: value, en: value };
  }
  if (input && typeof input === 'object') {
    const candidate = input as Partial<Record<'et' | 'en', unknown>>;
    const et = asText(candidate.et) || legacy;
    const en = asText(candidate.en) || legacy;
    return { et, en };
  }
  return { et: legacy, en: legacy };
}

function asLocalizedList(input: unknown, legacy: string[]): LocalizedListValue {
  if (Array.isArray(input)) {
    const value = asTextList(input);
    return { et: value, en: value };
  }
  if (input && typeof input === 'object') {
    const candidate = input as Partial<Record<'et' | 'en', unknown>>;
    const et = asTextList(candidate.et);
    const en = asTextList(candidate.en);
    return {
      et: et.length > 0 ? et : legacy,
      en: en.length > 0 ? en : legacy,
    };
  }
  return { et: legacy, en: legacy };
}

function fromRow(row: TeamRow): TeamMember {
  const tagsLegacy = asTextList(row.signature_tags);
  return {
    id: String(row.id),
    slug: row.slug || '',
    fullName: asLocalized({ et: row.full_name_et, en: row.full_name_en }, row.full_name),
    roleTitle: asLocalized({ et: row.role_title_et, en: row.role_title_en }, row.role_title),
    shortIntro: asLocalized({ et: row.short_intro_et, en: row.short_intro_en }, row.short_intro),
    mainImage: row.main_image || '',
    badge1Text: asLocalized({ et: row.badge_1_text_et, en: row.badge_1_text_en }, row.badge_1_text),
    badge2Text: asLocalized({ et: row.badge_2_text_et, en: row.badge_2_text_en }, row.badge_2_text),
    badge3Text: asLocalized({ et: row.badge_3_text_et, en: row.badge_3_text_en }, row.badge_3_text),
    feature1Title: asLocalized({ et: row.feature_1_title_et, en: row.feature_1_title_en }, row.feature_1_title),
    feature1Text: asLocalized({ et: row.feature_1_text_et, en: row.feature_1_text_en }, row.feature_1_text),
    feature2Title: asLocalized({ et: row.feature_2_title_et, en: row.feature_2_title_en }, row.feature_2_title),
    feature2Text: asLocalized({ et: row.feature_2_text_et, en: row.feature_2_text_en }, row.feature_2_text),
    feature3Title: asLocalized({ et: row.feature_3_title_et, en: row.feature_3_title_en }, row.feature_3_title),
    feature3Text: asLocalized({ et: row.feature_3_text_et, en: row.feature_3_text_en }, row.feature_3_text),
    signatureLabel: asLocalized({ et: row.signature_label_et, en: row.signature_label_en }, row.signature_label),
    signatureTags: asLocalizedList({ et: row.signature_tags_et, en: row.signature_tags_en }, tagsLegacy),
    previewGalleryImages: asTextList(row.preview_gallery_images),
    primaryCtaText: asLocalized({ et: row.primary_cta_text_et, en: row.primary_cta_text_en }, row.primary_cta_text),
    primaryCtaLink: row.primary_cta_link || '',
    availabilityHelperText: asLocalized(
      { et: row.availability_helper_text_et, en: row.availability_helper_text_en },
      row.availability_helper_text
    ),
    isVisible: row.is_visible,
    showOnHomepage: row.show_on_homepage,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function localizedTeamText(value: LocalizedValue, locale: string): string {
  const language = normalizeLocale(locale);
  return language === 'en' ? value.en : value.et;
}

export function localizedTeamList(value: LocalizedListValue, locale: string): string[] {
  const language = normalizeLocale(locale);
  return language === 'en' ? value.en : value.et;
}

export async function ensureTeamTable() {
  if (teamEnsurePromise) {
    await teamEnsurePromise;
    return;
  }

  teamEnsurePromise = (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id BIGSERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        full_name TEXT NOT NULL DEFAULT '',
        role_title TEXT NOT NULL DEFAULT '',
        short_intro TEXT NOT NULL DEFAULT '',
        main_image TEXT NOT NULL DEFAULT '',
        badge_1_text TEXT NOT NULL DEFAULT '',
        badge_2_text TEXT NOT NULL DEFAULT '',
        badge_3_text TEXT NOT NULL DEFAULT '',
        feature_1_title TEXT NOT NULL DEFAULT '',
        feature_1_text TEXT NOT NULL DEFAULT '',
        feature_2_title TEXT NOT NULL DEFAULT '',
        feature_2_text TEXT NOT NULL DEFAULT '',
        feature_3_title TEXT NOT NULL DEFAULT '',
        feature_3_text TEXT NOT NULL DEFAULT '',
        signature_label TEXT NOT NULL DEFAULT '',
        signature_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        preview_gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
        primary_cta_text TEXT NOT NULL DEFAULT '',
        primary_cta_link TEXT NOT NULL DEFAULT '',
        availability_helper_text TEXT NOT NULL DEFAULT '',
        is_visible BOOLEAN NOT NULL DEFAULT TRUE,
        show_on_homepage BOOLEAN NOT NULL DEFAULT TRUE,
        is_featured BOOLEAN NOT NULL DEFAULT FALSE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    for (const column of [
      'full_name_et', 'full_name_en', 'role_title_et', 'role_title_en', 'short_intro_et', 'short_intro_en',
      'badge_1_text_et', 'badge_1_text_en', 'badge_2_text_et', 'badge_2_text_en', 'badge_3_text_et', 'badge_3_text_en',
      'feature_1_title_et', 'feature_1_title_en', 'feature_1_text_et', 'feature_1_text_en',
      'feature_2_title_et', 'feature_2_title_en', 'feature_2_text_et', 'feature_2_text_en',
      'feature_3_title_et', 'feature_3_title_en', 'feature_3_text_et', 'feature_3_text_en',
      'signature_label_et', 'signature_label_en', 'primary_cta_text_et', 'primary_cta_text_en',
      'availability_helper_text_et', 'availability_helper_text_en',
    ]) {
      await sql.unsafe(`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS ${column} TEXT NOT NULL DEFAULT ''`);
    }
    await sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS signature_tags_et JSONB NOT NULL DEFAULT '[]'::jsonb`;
    await sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS signature_tags_en JSONB NOT NULL DEFAULT '[]'::jsonb`;

    await sql`
      UPDATE team_members
      SET
        full_name_et = COALESCE(NULLIF(full_name_et, ''), full_name),
        full_name_en = COALESCE(NULLIF(full_name_en, ''), full_name),
        role_title_et = COALESCE(NULLIF(role_title_et, ''), role_title),
        role_title_en = COALESCE(NULLIF(role_title_en, ''), role_title),
        short_intro_et = COALESCE(NULLIF(short_intro_et, ''), short_intro),
        short_intro_en = COALESCE(NULLIF(short_intro_en, ''), short_intro),
        signature_tags_et = CASE
          WHEN jsonb_typeof(signature_tags_et) = 'array' AND jsonb_array_length(signature_tags_et) > 0 THEN signature_tags_et
          WHEN jsonb_typeof(signature_tags) = 'array' THEN signature_tags
          ELSE '[]'::jsonb
        END,
        signature_tags_en = CASE
          WHEN jsonb_typeof(signature_tags_en) = 'array' AND jsonb_array_length(signature_tags_en) > 0 THEN signature_tags_en
          WHEN jsonb_typeof(signature_tags) = 'array' THEN signature_tags
          ELSE '[]'::jsonb
        END
    `;
  })();

  global.__nailify_team_ensure__ = teamEnsurePromise;
  await teamEnsurePromise;
}

export async function listTeamMembers(options?: { admin?: boolean; locale?: string }): Promise<TeamMember[]> {
  await ensureTeamTable();
  const isAdmin = Boolean(options?.admin);
  const rows = await sql<TeamRow[]>`
    SELECT
      id, slug, full_name, full_name_et, full_name_en, role_title, role_title_et, role_title_en,
      short_intro, short_intro_et, short_intro_en, main_image,
      badge_1_text, badge_1_text_et, badge_1_text_en, badge_2_text, badge_2_text_et, badge_2_text_en, badge_3_text, badge_3_text_et, badge_3_text_en,
      feature_1_title, feature_1_title_et, feature_1_title_en, feature_1_text, feature_1_text_et, feature_1_text_en,
      feature_2_title, feature_2_title_et, feature_2_title_en, feature_2_text, feature_2_text_et, feature_2_text_en,
      feature_3_title, feature_3_title_et, feature_3_title_en, feature_3_text, feature_3_text_et, feature_3_text_en,
      signature_label, signature_label_et, signature_label_en, signature_tags, signature_tags_et, signature_tags_en,
      preview_gallery_images, primary_cta_text, primary_cta_text_et, primary_cta_text_en, primary_cta_link,
      availability_helper_text, availability_helper_text_et, availability_helper_text_en,
      is_visible, show_on_homepage, is_featured, sort_order, created_at::text, updated_at::text
    FROM team_members
    ${isAdmin ? sql`` : sql`WHERE is_visible = TRUE AND show_on_homepage = TRUE`}
    ORDER BY sort_order ASC, is_featured DESC, created_at ASC
  `;
  return rows.map(fromRow);
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function toResolved(member: TeamMemberInput, existing?: TeamMember) {
  const row = existing;
  return {
    fullName: asLocalized(member.fullName, row?.fullName.et ?? ''),
    roleTitle: asLocalized(member.roleTitle, row?.roleTitle.et ?? ''),
    shortIntro: asLocalized(member.shortIntro, row?.shortIntro.et ?? ''),
    badge1Text: asLocalized(member.badge1Text, row?.badge1Text.et ?? ''),
    badge2Text: asLocalized(member.badge2Text, row?.badge2Text.et ?? ''),
    badge3Text: asLocalized(member.badge3Text, row?.badge3Text.et ?? ''),
    feature1Title: asLocalized(member.feature1Title, row?.feature1Title.et ?? ''),
    feature1Text: asLocalized(member.feature1Text, row?.feature1Text.et ?? ''),
    feature2Title: asLocalized(member.feature2Title, row?.feature2Title.et ?? ''),
    feature2Text: asLocalized(member.feature2Text, row?.feature2Text.et ?? ''),
    feature3Title: asLocalized(member.feature3Title, row?.feature3Title.et ?? ''),
    feature3Text: asLocalized(member.feature3Text, row?.feature3Text.et ?? ''),
    signatureLabel: asLocalized(member.signatureLabel, row?.signatureLabel.et ?? ''),
    signatureTags: asLocalizedList(member.signatureTags, row?.signatureTags.et ?? []),
    primaryCtaText: asLocalized(member.primaryCtaText, row?.primaryCtaText.et ?? ''),
    availabilityHelperText: asLocalized(member.availabilityHelperText, row?.availabilityHelperText.et ?? ''),
    mainImage: asText(member.mainImage) || row?.mainImage || '',
    previewGalleryImages: Array.isArray(member.previewGalleryImages)
      ? asTextList(member.previewGalleryImages)
      : row?.previewGalleryImages ?? [],
    primaryCtaLink: asText(member.primaryCtaLink) || row?.primaryCtaLink || '',
    isVisible: typeof member.isVisible === 'boolean' ? member.isVisible : row?.isVisible ?? true,
    showOnHomepage: typeof member.showOnHomepage === 'boolean' ? member.showOnHomepage : row?.showOnHomepage ?? true,
    isFeatured: typeof member.isFeatured === 'boolean' ? member.isFeatured : row?.isFeatured ?? false,
    sortOrder: typeof member.sortOrder === 'number' ? member.sortOrder : row?.sortOrder ?? 0,
  };
}

export async function createTeamMember(input: TeamMemberInput & { fullName: LocalizedValue | string }) {
  await ensureTeamTable();
  const [maxRow] = await sql<[{ max: number | null }]>`SELECT MAX(sort_order) AS max FROM team_members`;
  const nextSort = (maxRow.max ?? 0) + 1;
  const resolved = toResolved(input);
  const baseSlug = toSlug(input.slug ?? resolved.fullName.et) || `team-${Date.now()}`;

  const [row] = await sql<[{ id: number }]>`
    INSERT INTO team_members (
      slug, full_name, full_name_et, full_name_en, role_title, role_title_et, role_title_en,
      short_intro, short_intro_et, short_intro_en, main_image,
      badge_1_text, badge_1_text_et, badge_1_text_en, badge_2_text, badge_2_text_et, badge_2_text_en, badge_3_text, badge_3_text_et, badge_3_text_en,
      feature_1_title, feature_1_title_et, feature_1_title_en, feature_1_text, feature_1_text_et, feature_1_text_en,
      feature_2_title, feature_2_title_et, feature_2_title_en, feature_2_text, feature_2_text_et, feature_2_text_en,
      feature_3_title, feature_3_title_et, feature_3_title_en, feature_3_text, feature_3_text_et, feature_3_text_en,
      signature_label, signature_label_et, signature_label_en, signature_tags, signature_tags_et, signature_tags_en,
      preview_gallery_images, primary_cta_text, primary_cta_text_et, primary_cta_text_en, primary_cta_link,
      availability_helper_text, availability_helper_text_et, availability_helper_text_en,
      is_visible, show_on_homepage, is_featured, sort_order
    ) VALUES (
      ${`${baseSlug}-${nextSort}`}, ${resolved.fullName.et}, ${resolved.fullName.et}, ${resolved.fullName.en}, ${resolved.roleTitle.et}, ${resolved.roleTitle.et}, ${resolved.roleTitle.en},
      ${resolved.shortIntro.et}, ${resolved.shortIntro.et}, ${resolved.shortIntro.en}, ${resolved.mainImage},
      ${resolved.badge1Text.et}, ${resolved.badge1Text.et}, ${resolved.badge1Text.en}, ${resolved.badge2Text.et}, ${resolved.badge2Text.et}, ${resolved.badge2Text.en}, ${resolved.badge3Text.et}, ${resolved.badge3Text.et}, ${resolved.badge3Text.en},
      ${resolved.feature1Title.et}, ${resolved.feature1Title.et}, ${resolved.feature1Title.en}, ${resolved.feature1Text.et}, ${resolved.feature1Text.et}, ${resolved.feature1Text.en},
      ${resolved.feature2Title.et}, ${resolved.feature2Title.et}, ${resolved.feature2Title.en}, ${resolved.feature2Text.et}, ${resolved.feature2Text.et}, ${resolved.feature2Text.en},
      ${resolved.feature3Title.et}, ${resolved.feature3Title.et}, ${resolved.feature3Title.en}, ${resolved.feature3Text.et}, ${resolved.feature3Text.et}, ${resolved.feature3Text.en},
      ${resolved.signatureLabel.et}, ${resolved.signatureLabel.et}, ${resolved.signatureLabel.en}, ${JSON.stringify(resolved.signatureTags.et)}::jsonb, ${JSON.stringify(resolved.signatureTags.et)}::jsonb, ${JSON.stringify(resolved.signatureTags.en)}::jsonb,
      ${JSON.stringify(resolved.previewGalleryImages)}::jsonb, ${resolved.primaryCtaText.et}, ${resolved.primaryCtaText.et}, ${resolved.primaryCtaText.en}, ${resolved.primaryCtaLink},
      ${resolved.availabilityHelperText.et}, ${resolved.availabilityHelperText.et}, ${resolved.availabilityHelperText.en},
      ${resolved.isVisible}, ${resolved.showOnHomepage}, ${resolved.isFeatured}, ${nextSort}
    )
    RETURNING id
  `;
  return String(row.id);
}

export async function updateTeamMember(input: TeamMemberInput & { id: string }) {
  const all = await listTeamMembers({ admin: true });
  const existing = all.find((item) => item.id === input.id);
  if (!existing) return null;
  const resolved = toResolved(input, existing);
  const slug = toSlug(input.slug ?? existing.slug) || existing.slug;

  await sql`
    UPDATE team_members
    SET
      slug = ${slug},
      full_name = ${resolved.fullName.et},
      full_name_et = ${resolved.fullName.et},
      full_name_en = ${resolved.fullName.en},
      role_title = ${resolved.roleTitle.et},
      role_title_et = ${resolved.roleTitle.et},
      role_title_en = ${resolved.roleTitle.en},
      short_intro = ${resolved.shortIntro.et},
      short_intro_et = ${resolved.shortIntro.et},
      short_intro_en = ${resolved.shortIntro.en},
      main_image = ${resolved.mainImage},
      badge_1_text = ${resolved.badge1Text.et},
      badge_1_text_et = ${resolved.badge1Text.et},
      badge_1_text_en = ${resolved.badge1Text.en},
      badge_2_text = ${resolved.badge2Text.et},
      badge_2_text_et = ${resolved.badge2Text.et},
      badge_2_text_en = ${resolved.badge2Text.en},
      badge_3_text = ${resolved.badge3Text.et},
      badge_3_text_et = ${resolved.badge3Text.et},
      badge_3_text_en = ${resolved.badge3Text.en},
      feature_1_title = ${resolved.feature1Title.et},
      feature_1_title_et = ${resolved.feature1Title.et},
      feature_1_title_en = ${resolved.feature1Title.en},
      feature_1_text = ${resolved.feature1Text.et},
      feature_1_text_et = ${resolved.feature1Text.et},
      feature_1_text_en = ${resolved.feature1Text.en},
      feature_2_title = ${resolved.feature2Title.et},
      feature_2_title_et = ${resolved.feature2Title.et},
      feature_2_title_en = ${resolved.feature2Title.en},
      feature_2_text = ${resolved.feature2Text.et},
      feature_2_text_et = ${resolved.feature2Text.et},
      feature_2_text_en = ${resolved.feature2Text.en},
      feature_3_title = ${resolved.feature3Title.et},
      feature_3_title_et = ${resolved.feature3Title.et},
      feature_3_title_en = ${resolved.feature3Title.en},
      feature_3_text = ${resolved.feature3Text.et},
      feature_3_text_et = ${resolved.feature3Text.et},
      feature_3_text_en = ${resolved.feature3Text.en},
      signature_label = ${resolved.signatureLabel.et},
      signature_label_et = ${resolved.signatureLabel.et},
      signature_label_en = ${resolved.signatureLabel.en},
      signature_tags = ${JSON.stringify(resolved.signatureTags.et)}::jsonb,
      signature_tags_et = ${JSON.stringify(resolved.signatureTags.et)}::jsonb,
      signature_tags_en = ${JSON.stringify(resolved.signatureTags.en)}::jsonb,
      preview_gallery_images = ${JSON.stringify(resolved.previewGalleryImages)}::jsonb,
      primary_cta_text = ${resolved.primaryCtaText.et},
      primary_cta_text_et = ${resolved.primaryCtaText.et},
      primary_cta_text_en = ${resolved.primaryCtaText.en},
      primary_cta_link = ${resolved.primaryCtaLink},
      availability_helper_text = ${resolved.availabilityHelperText.et},
      availability_helper_text_et = ${resolved.availabilityHelperText.et},
      availability_helper_text_en = ${resolved.availabilityHelperText.en},
      is_visible = ${resolved.isVisible},
      show_on_homepage = ${resolved.showOnHomepage},
      is_featured = ${resolved.isFeatured},
      sort_order = ${resolved.sortOrder},
      updated_at = NOW()
    WHERE id = ${Number(input.id)}::bigint
  `;
  return input.id;
}

export async function reorderTeamMembers(orderedIds: string[]) {
  await ensureTeamTable();
  let order = 1;
  for (const id of orderedIds) {
    await sql`UPDATE team_members SET sort_order = ${order}, updated_at = NOW() WHERE id = ${Number(id)}::bigint`;
    order += 1;
  }
}

export async function deleteTeamMember(id: string) {
  await ensureTeamTable();
  await sql`DELETE FROM team_members WHERE id = ${Number(id)}::bigint`;
}
