/**
 * Session Management for Anonymous Users
 * 
 * Provides lightweight session persistence for favorites, cart, and booking progress.
 * Uses cookie-based session IDs with PostgreSQL storage.
 * 
 * Key features:
 * - Auto-creates session on first interaction
 * - LocalStorage fallback for offline/speed
 * - Debounced server sync (500ms)
 * - 30-day expiry with activity extension
 * 
 * Usage:
 *   const sessionId = getOrCreateSession();
 *   await syncFavoritesToServer(favorites, sessionId);
 */

import { sql } from './db';
import { isDatabaseMigrated } from './schema-validator';

// ============================================================================
// Constants
// ============================================================================

const SESSION_COOKIE = 'nailify_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const SESSION_PREFIX = 'nfs_'; // Nailify Session

// Data type constants
export type SessionDataType = 'favorites' | 'cart' | 'booking_progress';

// ============================================================================
// Cookie Management (Client-side)
// ============================================================================

/**
 * Get session ID from cookie
 * Returns null if no session exists
 */
export function getSessionIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Set session cookie with proper attributes
 */
export function setSessionCookie(sessionId: string): void {
  if (typeof document === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + SESSION_MAX_AGE * 1000);
  
  const cookieValue = `${sessionId}; path=/; max-age=${SESSION_MAX_AGE}; samesite=lax; secure`;
  document.cookie = `${SESSION_COOKIE}=${cookieValue}`;
}

/**
 * Get existing session ID or create new one
 * Also ensures cookie is set
 */
export function getOrCreateSession(): string {
  // Try to get existing session
  let sessionId = getSessionIdFromCookie();
  
  // Validate existing session format
  if (sessionId && sessionId.startsWith(SESSION_PREFIX)) {
    return sessionId;
  }
  
  // Create new session
  sessionId = createSessionId();
  setSessionCookie(sessionId);
  return sessionId;
}

/**
 * Generate a new session ID
 * Format: nfs_<uuid>_<timestamp>
 */
export function createSessionId(): string {
  const uuid = generateUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  return `${SESSION_PREFIX}${uuid}_${timestamp}`;
}

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// Server-side Session Management
// ============================================================================

/**
 * Ensure session tables exist
 */
let sessionEnsurePromise: Promise<void> | null = null;

export async function ensureSessionTables(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    const migrated = await isDatabaseMigrated();
    if (migrated) {
      return;
    }
  }

  if (sessionEnsurePromise) {
    await sessionEnsurePromise;
    return;
  }

  sessionEnsurePromise = ensureSessionTablesInternal();
  await sessionEnsurePromise;
}

async function ensureSessionTablesInternal(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS user_sessions (
      session_id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      ip_address TEXT,
      user_agent TEXT
    )
  `;
  
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON user_sessions(last_activity_at)`;
  
  await sql`
    CREATE TABLE IF NOT EXISTS session_data (
      id BIGSERIAL PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES user_sessions(session_id) ON DELETE CASCADE,
      data_type TEXT NOT NULL CHECK (data_type IN ('favorites', 'cart', 'booking_progress')),
      data_key TEXT NOT NULL DEFAULT '',
      data_value JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(session_id, data_type, data_key)
    )
  `;
  
  await sql`CREATE INDEX IF NOT EXISTS idx_session_data_session ON session_data(session_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_session_data_type ON session_data(data_type)`;
}

/**
 * Create or update session activity
 */
export async function touchSession(sessionId: string): Promise<void> {
  await ensureSessionTables();
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  await sql`
    INSERT INTO user_sessions (session_id, created_at, last_activity_at, expires_at)
    VALUES (${sessionId}, NOW(), NOW(), ${expiresAt.toISOString()})
    ON CONFLICT (session_id) DO UPDATE SET
      last_activity_at = NOW(),
      expires_at = GREATEST(user_sessions.expires_at, ${expiresAt.toISOString()})
  `;
}

/**
 * Get session data for a specific type
 */
export async function getSessionData<T>(
  sessionId: string, 
  dataType: SessionDataType
): Promise<T | null> {
  await ensureSessionTables();
  
  const result = await sql<{ data_value: T }[]>`
    SELECT data_value 
    FROM session_data 
    WHERE session_id = ${sessionId} AND data_type = ${dataType}
  `;
  
  if (result.length === 0) {
    return null;
  }
  
  return result[0].data_value;
}

/**
 * Save session data for a specific type
 */
export async function saveSessionData<T>(
  sessionId: string,
  dataType: SessionDataType,
  dataKey: string,
  dataValue: T
): Promise<void> {
  await ensureSessionTables();
  await touchSession(sessionId);
  
  await sql`
    INSERT INTO session_data (session_id, data_type, data_key, data_value, updated_at)
    VALUES (${sessionId}, ${dataType}, ${dataKey}, ${JSON.stringify(dataValue)}, NOW())
    ON CONFLICT (session_id, data_type, data_key) DO UPDATE SET
      data_value = EXCLUDED.data_value,
      updated_at = NOW()
  `;
}

/**
 * Delete session data
 */
export async function deleteSessionData(
  sessionId: string,
  dataType?: SessionDataType
): Promise<void> {
  await ensureSessionTables();
  
  if (dataType) {
    await sql`
      DELETE FROM session_data 
      WHERE session_id = ${sessionId} AND data_type = ${dataType}
    `;
  } else {
    await sql`DELETE FROM session_data WHERE session_id = ${sessionId}`;
    await sql`DELETE FROM user_sessions WHERE session_id = ${sessionId}`;
  }
}

/**
 * Clean up expired sessions (lazy cleanup)
 * Should be called periodically or on each request
 */
export async function cleanupExpiredSessions(limit = 100): Promise<number> {
  await ensureSessionTables();
  // PostgreSQL DELETE does not support LIMIT; use subquery to cap rows deleted
  const deleted = await sql<{ session_id: string }[]>`
    DELETE FROM user_sessions
    WHERE session_id IN (
      SELECT session_id FROM user_sessions WHERE expires_at < NOW() LIMIT ${limit}
    )
    RETURNING session_id
  `;
  return deleted.length;
}

// ============================================================================
// Types for session data
// ============================================================================

export interface SessionFavorite {
  productId: string;
  addedAt: string;
}

export interface SessionCartItem {
  productId: string;
  quantity: number;
  price?: number;
  addedAt: string;
}

export interface SessionCart {
  items: SessionCartItem[];
  updatedAt: string;
}

export interface SessionBookingProgress {
  step: number;
  selectedService?: {
    id: string;
    name: string;
    price: number;
  };
  selectedSlot?: {
    date: string;
    time: string;
  };
  contactInfo?: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  selectedAddOns?: string[];
  updatedAt: string;
}
