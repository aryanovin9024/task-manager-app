import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 reads connection details from here rather than from schema.prisma.
 * The runtime client gets its connection through the pg driver adapter in
 * src/lib/prisma.ts; this file is what the CLI (migrate, seed, studio) uses.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
