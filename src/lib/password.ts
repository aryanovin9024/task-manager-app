import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id parameters following the OWASP Password Storage Cheat Sheet
 * (19 MiB memory, 2 iterations, 1 degree of parallelism).
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, ARGON2_OPTIONS);
  } catch {
    // A malformed hash must read as "wrong password", never as a crash.
    return false;
  }
}
