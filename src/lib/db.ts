import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or POSTGRES_URL is required');
}

declare global {
  // eslint-disable-next-line no-var
  var __nailify_sql__: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__nailify_sql__ ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__nailify_sql__ = sql;
}

