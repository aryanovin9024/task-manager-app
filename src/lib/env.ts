import { getConnectionString } from '@netlify/database';
import { z } from 'zod';

/**
 * Environment contract. Parsed once at module load so a misconfigured
 * deployment fails loudly instead of misbehaving at runtime.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z
    .string()
    .min(16, 'SESSION_SECRET must be at least 16 characters — run: openssl rand -base64 32'),
  WEEK_STARTS_ON: z
    .string()
    .optional()
    .transform((value) => (value === undefined || value.trim() === '' ? 1 : Number(value)))
    .pipe(
      z
        .number()
        .int()
        .min(0)
        .max(6, 'WEEK_STARTS_ON must be 0 (Sunday) through 6 (Saturday)'),
    ),
});

/**
 * Where the Postgres connection string comes from.
 *
 * Off-platform — local development, CI — it is DATABASE_URL in the
 * environment, and that always wins. On Netlify the managed Postgres is
 * provisioned by the platform, which keeps the read-write credential to
 * itself and hands it over only through its own accessor at runtime, so ask
 * for it last and only if nothing else supplied one.
 */
function resolveDatabaseUrl(): string | undefined {
  const fromEnvironment =
    process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL ?? process.env.NETLIFY_DB_URL;
  if (fromEnvironment) return fromEnvironment;

  try {
    return getConnectionString();
  } catch {
    // Not running on Netlify, or no database attached to this site.
    return undefined;
  }
}

const parsed = envSchema.safeParse({
  DATABASE_URL: resolveDatabaseUrl(),
  SESSION_SECRET: process.env.SESSION_SECRET,
  WEEK_STARTS_ON: process.env.WEEK_STARTS_ON,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
}

export const env = parsed.data;
