import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default {
  schema: './src/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;