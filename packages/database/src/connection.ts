import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDatabase(connectionString: string) {
  const client = postgres(connectionString, {
    ssl: 'require',
    max: 20,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

export function createDatabaseFromEnv() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return createDatabase(connectionString);
}

export type Database = ReturnType<typeof createDatabase>;