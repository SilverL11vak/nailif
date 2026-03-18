import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';

export const ADMIN_SESSION_COOKIE = 'nailify_admin_session';
const SESSION_TTL_DAYS = 14;

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
}

declare global {
  var __nailify_admin_ensure__: Promise<void> | undefined;
}

let adminEnsurePromise: Promise<void> | null = global.__nailify_admin_ensure__ ?? null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, fullHash: string) {
  const [salt, storedHash] = fullHash.split(':');
  if (!salt || !storedHash) return false;
  const testHash = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(storedHash, 'hex');
  if (storedBuffer.length !== testHash.length) return false;
  return timingSafeEqual(storedBuffer, testHash);
}

async function ensureAdminTablesInternal() {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function ensureAdminTables() {
  // TRANSITIONAL: Skip ensure in production if migrations have been run
  // TODO: After migrations are fully deployed and verified, remove this function
  // and rely entirely on migrations in migrations/007_admin.sql
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  if (!adminEnsurePromise) {
    adminEnsurePromise = ensureAdminTablesInternal();
    global.__nailify_admin_ensure__ = adminEnsurePromise;
  }
  await adminEnsurePromise;
}

export async function adminCount() {
  const [row] = await sql<[{ count: string }]>`
    SELECT COUNT(*)::text AS count FROM admin_users
  `;
  return Number(row.count);
}

export async function createAdminUser(input: { email: string; password: string; name?: string | null }) {
  const email = normalizeEmail(input.email);
  const passwordHash = hashPassword(input.password);

  const [row] = await sql<[{ id: number; email: string; name: string | null }]>`
    INSERT INTO admin_users (email, name, password_hash)
    VALUES (${email}, ${input.name ?? null}, ${passwordHash})
    RETURNING id, email, name
  `;

  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
  } satisfies AdminUser;
}

export async function authenticateAdmin(email: string, password: string): Promise<AdminUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const [row] = await sql<[{ id: number; email: string; name: string | null; password_hash: string }]>`
    SELECT id, email, name, password_hash
    FROM admin_users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `;

  if (!row) return null;
  if (!verifyPassword(password, row.password_hash)) return null;

  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
  };
}

export async function createAdminSession(adminUserId: string) {
  const token = randomBytes(32).toString('hex');
  const [row] = await sql<[{ expires_at: string }]>`
    INSERT INTO admin_sessions (token, admin_user_id, expires_at)
    VALUES (
      ${token},
      ${Number(adminUserId)},
      NOW() + INTERVAL '14 days'
    )
    RETURNING expires_at::text
  `;

  return {
    token,
    expiresAt: row.expires_at,
  };
}

export async function deleteAdminSession(token: string) {
  await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
}

export async function getAdminBySessionToken(token: string): Promise<AdminUser | null> {
  const [row] = await sql<[{ id: number; email: string; name: string | null }]>`
    SELECT u.id, u.email, u.name
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.admin_user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
    LIMIT 1
  `;

  if (!row) return null;
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
  };
}

export async function getAdminFromCookies(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getAdminBySessionToken(token);
}

export async function updateAdminName(adminUserId: string, name: string | null): Promise<AdminUser | null> {
  const [row] = await sql<[{ id: number; email: string; name: string | null }]>`
    UPDATE admin_users
    SET name = ${name}
    WHERE id = ${Number(adminUserId)}::bigint
    RETURNING id, email, name
  `;

  if (!row) return null;
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
  };
}

export async function changeAdminPassword(input: {
  adminUserId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; reason: 'invalid_current_password' | 'not_found' }> {
  const [row] = await sql<[{ id: number; password_hash: string }]>`
    SELECT id, password_hash
    FROM admin_users
    WHERE id = ${Number(input.adminUserId)}::bigint
    LIMIT 1
  `;

  if (!row) {
    return { ok: false, reason: 'not_found' };
  }
  if (!verifyPassword(input.currentPassword, row.password_hash)) {
    return { ok: false, reason: 'invalid_current_password' };
  }

  await sql`
    UPDATE admin_users
    SET password_hash = ${hashPassword(input.newPassword)}
    WHERE id = ${Number(input.adminUserId)}::bigint
  `;

  await sql`DELETE FROM admin_sessions WHERE admin_user_id = ${Number(input.adminUserId)}::bigint`;
  return { ok: true };
}

export function getSessionMaxAgeSeconds() {
  return SESSION_TTL_DAYS * 24 * 60 * 60;
}
