/**
 * Schema Validation Helper
 * 
 * This module provides validation that required database tables exist.
 * It's used to determine whether the runtime ensure-table functions
 * need to run (development) or can be skipped (production with migrations).
 * 
 * TRANSITIONAL: This helper will be removed once migrations are fully
 * deployed and the ensure functions are no longer needed.
 * 
 * Usage:
 *   - In development: Always check tables exist
 *   - In production (migrations run): Skip ensure, rely on migrations
 */

import { sql } from './db';

// Cache for table existence checks (valid for request lifetime)
let tableCheckCache: Map<string, boolean> | null = null;

/**
 * Get list of tables that should exist for the application to function.
 * Maps friendly names to actual table names.
 */
export function getRequiredTables(): Record<string, string> {
  return {
    // Core business tables
    customers: 'customers',
    bookings: 'bookings',
    orders: 'orders',
    
    // Catalog
    services: 'services',
    products: 'products',
    
    // Content
    gallery: 'gallery_images',
    homepageMedia: 'homepage_media',
    feedback: 'feedback',
    
    // Booking
    slots: 'time_slots',
    bookingContent: 'booking_content',
    bookingAddons: 'booking_addons',
    
    // Analytics
    analyticsSessions: 'booking_analytics_sessions',
    analyticsEvents: 'booking_analytics_events',
    analyticsSlotClicks: 'booking_analytics_slot_clicks',
    funnelEvents: 'booking_funnel_events',
    
    // Admin
    adminUsers: 'admin_users',
    adminSessions: 'admin_sessions',
    
    // Webhooks
    webhookEvents: 'stripe_webhook_events',
    
    // Internal
    migrations: '__migrations',
  };
}

/**
 * Check if a specific table exists in the database.
 * Results are cached per request for performance.
 */
export async function checkTableExists(tableName: string): Promise<boolean> {
  // Initialize cache if needed
  if (!tableCheckCache) {
    tableCheckCache = new Map();
  }
  
  // Check cache first
  if (tableCheckCache.has(tableName)) {
    return tableCheckCache.get(tableName)!;
  }
  
  try {
    const result = await sql<[{ exists: boolean }]>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${tableName}
      ) as exists
    `;
    
    const exists = result[0]?.exists ?? false;
    tableCheckCache.set(tableName, exists);
    return exists;
  } catch {
    // If we can't check, assume table doesn't exist
    return false;
  }
}

/**
 * Check multiple tables at once.
 */
export async function checkTablesExist(tableNames: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    tableNames.map(async (name) => {
      results[name] = await checkTableExists(name);
    })
  );
  
  return results;
}

/**
 * Check if all required tables for a specific domain exist.
 * Useful for determining if ensure functions need to run.
 */
export async function validateDomainTables(domain: keyof ReturnType<typeof getRequiredTables>): Promise<boolean> {
  const domainTableMap: Record<string, string[]> = {
    customers: ['customers', 'customer_identity_conflicts'],
    bookings: ['bookings'],
    orders: ['orders'],
    services: ['services'],
    products: ['products'],
    gallery: ['gallery_images'],
    homepageMedia: ['homepage_media'],
    feedback: ['feedback'],
    slots: ['time_slots'],
    bookingContent: ['booking_content'],
    bookingAddons: ['booking_addons'],
    analyticsSessions: ['booking_analytics_sessions'],
    analyticsEvents: ['booking_analytics_events', 'booking_analytics_slot_clicks'],
    funnelEvents: ['booking_funnel_events'],
    adminUsers: ['admin_users', 'admin_sessions'],
    webhookEvents: ['stripe_webhook_events'],
    migrations: ['__migrations'],
  };
  
  const requiredTableNames = domainTableMap[domain] || [];
  
  for (const tableName of requiredTableNames) {
    const exists = await checkTableExists(tableName);
    if (!exists) {
      return false;
    }
  }
  
  return true;
}

/**
 * Clear the table existence cache.
 * Call this at the start of a new request if needed.
 */
export function clearTableCache(): void {
  tableCheckCache = null;
}

/**
 * Development-only helper that logs warnings for missing tables.
 * This helps identify migration issues during development.
 * 
 * TRANSITIONAL: Remove after migrations are fully deployed.
 */
export async function warnOnMissingTables(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return; // Don't warn in production
  }
  
  const domainTableMap: Record<string, string[]> = {
    customers: ['customers'],
    bookings: ['bookings'],
    orders: ['orders'],
    services: ['services'],
    products: ['products'],
    gallery: ['gallery_images'],
    homepageMedia: ['homepage_media'],
    feedback: ['feedback'],
    slots: ['time_slots'],
    bookingContent: ['booking_content'],
    bookingAddons: ['booking_addons'],
    analyticsSessions: ['booking_analytics_sessions'],
    analyticsEvents: ['booking_analytics_events'],
    funnelEvents: ['booking_funnel_events'],
    adminUsers: ['admin_users'],
    webhookEvents: ['stripe_webhook_events'],
    migrations: ['__migrations'],
  };
  
  for (const tableName of Object.values(domainTableMap).flat()) {
    const exists = await checkTableExists(tableName);
    if (!exists) {
      console.warn(`[schema-validator] Missing table: ${tableName} (run migrations: npm run migrate)`);
    }
  }
}

/**
 * Check if the database has been migrated (migrations table exists and has entries).
 * This indicates migrations have been run at least once.
 */
export async function isDatabaseMigrated(): Promise<boolean> {
  const migrationsExist = await checkTableExists('__migrations');
  if (!migrationsExist) {
    return false;
  }
  
  try {
    const result = await sql<[{ count: string }]>`
      SELECT COUNT(*)::text as count FROM __migrations
    `;
    const count = parseInt(result[0]?.count || '0', 10);
    return count > 0;
  } catch {
    return false;
  }
}
