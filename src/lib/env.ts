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

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  WEEK_STARTS_ON: process.env.WEEK_STARTS_ON,
});

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
}

export const env = parsed.data;
