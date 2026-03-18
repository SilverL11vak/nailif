/**
 * Migration Runner for Nailify Database
 * 
 * Usage:
 *   npx tsx migrations/migrate.ts
 *   npm run migrate
 * 
 * Features:
 *   - Migration state tracked in __migrations table
 *   - Advisory lock prevents concurrent execution
 *   - Ordered by filename prefix (001_, 002_, etc.)
 *   - Graceful error handling with logging
 */

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

// Get database connection
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname);
const MIGRATIONS_TABLE = '__migrations';
const LOCK_ID = 1234567890; // Advisory lock ID

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

function logWarn(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

async function getDatabaseUrl(): Promise<string> {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

async function createPostgresConnection() {
  const connectionString = await getDatabaseUrl();
  
  if (!connectionString) {
    throw new Error('DATABASE_URL or POSTGRES_URL environment variable is required');
  }
  
  return postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });
}

interface MigrationRow {
  id: string;
  name: string;
  executed_at: Date;
}

async function ensureMigrationsTable(sql: ReturnType<typeof postgres>): Promise<void> {
  logInfo('Ensuring migrations table exists...');
  
  await sql`
    CREATE TABLE IF NOT EXISTS ${sql(MIGRATIONS_TABLE)} (
      id VARCHAR(10) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getExecutedMigrations(sql: ReturnType<typeof postgres>): Promise<Set<string>> {
  try {
    const rows = await sql<[MigrationRow]>`SELECT id, name, executed_at FROM ${sql(MIGRATIONS_TABLE)}`;
    return new Set(rows.map((r) => r.id));
  } catch {
    logWarn('Could not read migrations table, starting fresh');
    return new Set();
  }
}

async function acquireLock(sql: ReturnType<typeof postgres>): Promise<boolean> {
  const result = await sql<[{ acquired: boolean }]>`SELECT pg_try_advisory_lock(${LOCK_ID}) as acquired`;
  return result[0]?.acquired ?? false;
}

async function releaseLock(sql: ReturnType<typeof postgres>): Promise<void> {
  await sql`SELECT pg_advisory_unlock(${LOCK_ID})`;
}

async function executeMigration(
  sql: ReturnType<typeof postgres>,
  id: string,
  name: string,
  content: string
): Promise<void> {
  logInfo(`Running migration: ${id} ${name}`);
  
  try {
    // Split by semicolon for multiple statements
    // Filter out empty statements and comments
    const statements = content
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await sql.unsafe(statement);
      }
    }
    
    // Record successful migration
    await sql`
      INSERT INTO ${sql(MIGRATIONS_TABLE)} (id, name, executed_at)
      VALUES (${id}, ${name}, NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    
    logSuccess(`Completed: ${id} ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Migration ${id} failed: ${message}`);
  }
}

async function runMigrations(): Promise<void> {
  log('━'.repeat(50), colors.cyan);
  log('🔄 Nailify Database Migration Runner', colors.cyan);
  log('━'.repeat(50), colors.cyan);
  console.log();
  
  const connectionString = await getDatabaseUrl();
  if (!connectionString) {
    logError('DATABASE_URL or POSTGRES_URL environment variable is required');
    logInfo('Example: DATABASE_URL=postgres://user:pass@host/db npm run migrate');
    process.exit(1);
  }
  
  const sql = await createPostgresConnection();
  
  try {
    // Try to acquire advisory lock
    const lockAcquired = await acquireLock(sql);
    
    if (!lockAcquired) {
      logError('Another migration is already running. Please wait and try again.');
      process.exit(1);
    }
    
    logInfo('Acquired migration lock');
    
    // Ensure migrations table exists
    await ensureMigrationsTable(sql);
    
    // Get already executed migrations
    const executed = await getExecutedMigrations(sql);
    logInfo(`Found ${executed.size} previously executed migrations`);
    
    // Get all migration files
    let files: string[] = [];
    try {
      files = readdirSync(MIGRATIONS_DIR)
        .filter(f => /^\d+_[a-z_]+\.sql$/.test(f))
        .sort();
    } catch {
      logError(`Could not read migrations directory: ${MIGRATIONS_DIR}`);
      process.exit(1);
    }
    
    if (files.length === 0) {
      logWarn('No migration files found');
      return;
    }
    
    logInfo(`Found ${files.length} migration files`);
    console.log();
    
    let executedCount = 0;
    let skippedCount = 0;
    
    for (const file of files) {
      const id = file.split('_')[0];
      const name = file.slice(id.length + 1, -4); // Remove .sql
      
      if (executed.has(id)) {
        log(`  ⏭ ${id} ${name} (already executed)`, colors.yellow);
        skippedCount++;
      } else {
        const filepath = join(MIGRATIONS_DIR, file);
        const content = readFileSync(filepath, 'utf-8');
        
        await executeMigration(sql, id, name, content);
        executedCount++;
      }
    }
    
    console.log();
    log('━'.repeat(50), colors.cyan);
    
    if (executedCount > 0) {
      logSuccess(`Executed ${executedCount} migration(s)`);
    } else {
      logInfo('No new migrations to execute');
    }
    
    if (skippedCount > 0) {
      logInfo(`Skipped ${skippedCount} previously executed migration(s)`);
    }
    
    log('━'.repeat(50), colors.cyan);
    logSuccess('Migration complete!');
    
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(`Migration failed: ${message}`);
    process.exit(1);
  } finally {
    await releaseLock(sql);
    await sql.end();
  }
}

// Run if executed directly
runMigrations().catch(() => {
  console.error('Unexpected error');
  process.exit(1);
});
