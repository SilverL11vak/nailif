import 'server-only';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_URL is required');
}

declare global {
  var __nailify_sql__: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__nailify_sql__ ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: (notice) => {
      // Silence common migration notices such as "already exists, skipping".
      if (notice?.code === '42P07' || notice?.code === '42701') return;

      if (process.env.NODE_ENV !== 'production') {
        console.warn('[postgres notice]', {
          code: notice?.code,
          message: notice?.message,
        });
      }
    },
  });

if (process.env.NODE_ENV !== 'production') {
  global.__nailify_sql__ = sql;
}
