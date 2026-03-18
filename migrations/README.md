# Database Migrations for Nailify

This folder contains versioned SQL migrations for the Nailify database.

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (Neon)
- Environment variable `DATABASE_URL` or `POSTGRES_URL`

### Running Migrations

```bash
# Install tsx if not already installed
npm install -D tsx

# Run migrations
npm run migrate

# Or directly with npx
npx tsx migrations/migrate.ts
```

### Environment Variables

```bash
# Set database URL
export DATABASE_URL="postgres://user:password@host:5432/database"

# Or use POSTGRES_URL
export POSTGRES_URL="postgres://user:password@host:5432/database"
```

## Migration Structure

### Files

| File | Description |
|------|-------------|
| `migrate.ts` | TypeScript migration runner |
| `001_initial_schema.sql` | Core tables (customers, bookings, orders) |
| `002_catalog.sql` | Services & Products |
| `003_content.sql` | Gallery, homepage_media, feedback |
| `004_slots.sql` | Time slots |
| `005_booking.sql` | Booking content & add-ons |
| `006_analytics.sql` | Analytics & funnel events |
| `007_admin.sql` | Admin users & sessions |
| `008_webhooks.sql` | Stripe webhook events |
| `009_seed_data.sql` | Initial seed data |

### Naming Convention

- Prefix with 3-digit number: `001_`, `002_`, etc.
- Use lowercase with underscores: `001_initial_schema.sql`
- Migration IDs must be unique

## How It Works

1. **Runner (`migrate.ts`)**:
   - Reads all `*.sql` files from this directory
   - Executes them in filename order (001, 002, etc.)
   - Tracks executed migrations in `__migrations` table
   - Skips already-executed migrations

2. **Locking**:
   - Uses PostgreSQL advisory lock to prevent concurrent runs
   - If another migration is running, exits with error

3. **Idempotency**:
   - Uses `CREATE TABLE IF NOT EXISTS` - safe to re-run
   - Tracks executed migrations to avoid duplicates

## Creating a New Migration

1. Create a new file with next number:
   ```bash
   touch migrations/010_new_feature.sql
   ```

2. Add SQL statements:
   ```sql
   -- 010_new_feature.sql
   -- Description of the migration
   
   ALTER TABLE customers ADD COLUMN new_field TEXT;
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Vercel Deployment

Add to your Vercel project settings:

1. Go to Settings → Environment Variables
2. Add `DATABASE_URL` with your Neon connection string
3. Add build command: `npm run prebuild && npm run migrate && npm run build`

Or configure in `vercel.json`:

```json
{
  "buildCommand": "npm run migrate && npm run build",
  "installCommand": "npm ci"
}
```

## Development Workflow

### New Developer Setup

```bash
# Clone repository
git clone git@github.com:owner/nailify.git
cd nailify

# Install dependencies
npm install

# Run migrations to create database tables
npm run migrate

# Start development server
npm run dev
```

### Making Schema Changes

1. Create new migration file
2. Test locally with `npm run migrate`
3. Commit migration file
4. CI/CD will run migrations on deploy

## Troubleshooting

### Lock Timeout

If migrations hang, another process may hold the lock:
```sql
-- Check for holding processes
SELECT * FROM pg_locks WHERE locktype = 'advisory';
```

### Missing Tables

If tables don't exist after migration:
1. Check `__migrations` table
2. Re-run with fresh database if needed

### Connection Issues

Verify DATABASE_URL format:
```
postgres://username:password@host:port/database
```

## Rollback

For simple rollbacks, create a new migration:
```sql
-- 011_fix_migration.sql
ALTER TABLE table_name DROP COLUMN IF EXISTS bad_column;
```

For major issues, restore from database backup:
```bash
# Neon CLI
neonctl branches restore --branch-name main --timestamp "2026-03-18T10:00:00Z"
```

## Notes

- Existing `ensure*` functions in `src/lib/` are still used in development
- Migrations should eventually replace runtime schema creation
- Always test migrations locally before deploying
- Back up production database before running new migrations
