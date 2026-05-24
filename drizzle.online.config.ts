import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Cargar variables de entorno para obtener DATABASE_URL
dotenv.config();

export default {
  schema: './db/schema_online/index.ts',
  out: './db/migrations_neon',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
