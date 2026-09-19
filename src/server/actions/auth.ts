'use server';

import { redirect } from 'next/navigation';
import { LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS } from '@/lib/config';
import { isValidTimeZone } from '@/lib/dates';
import { hashPassword, verifyPassword } from '@/lib/password';
import { prisma } from '@/lib/prisma';
import { createSession, destroyCurrentSession, setSessionCookie } from '@/lib/session';
import { invalid, loginSchema, signupSchema, type ActionState } from '@/lib/validation';

/**
 * A real Argon2id hash of a throwaway password. When an unknown identifier is
 * submitted we still run a verification against this, so a missing account and
 * a wrong password take the same amount of time.
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$OYM1a1pe1jsB29cJMG1Wkg$lvBSPSHnmvhDNK2u5HR5+hkLyrjeGihbYtl0ofmJamU';

/** Deliberately identical for every failure mode — never hints at which field was wrong. */
const INVALID_CREDENTIALS = 'Invalid credentials.';

export async function signupAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    username: formData.get('username'),
    displayName: formData.get('displayName'),
    password: formData.get('password'),
    timezone: formData.get('timezone'),
  });

  if (!parsed.success) return invalid(parsed.error);
  const { email, username, displayName, password, timezone } = parsed.data;

  const [emailTaken, usernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
  ]);

  if (emailTaken || usernameTaken) {
    const fieldErrors: Record<string, string> = {};
    if (emailTaken) fieldErrors.email = 'That email is already registered.';
    if (usernameTaken) fieldErrors.username = 'That username is taken.';
    return { status: 'error', message: 'Please fix the highlighted fields.', fieldErrors };
  }

  const passwordHash = await hashPassword(password);
  const detectedTimezone = timezone && isValidTimeZone(timezone) ? timezone : 'UTC';

  let userId: string;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName,
        passwordHash,
        timezone: detectedTimezone,
        timezoneAuto: true,
      },
      select: { id: true },
    });
    userId = user.id;
  } catch {
    // Lost a race against a concurrent signup on the same email/username.
    return {
      status: 'error',
      message: 'That email or username was just taken. Try another.',
    };
  }

  const { token, expiresAt } = await createSession(userId);
  await setSessionCookie(token, expiresAt);

  redirect('/dashboard');
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password'),
    timezone: formData.get('timezone'),
    next: formData.get('next'),
  });

  if (!parsed.success) return invalid(parsed.error);
  const { identifier, password, timezone, next } = parsed.data;

  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);

  // Keep the table small: drop anything older than the window on every attempt.
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: windowStart } } });

  const recentFailures = await prisma.loginAttempt.count({
    where: { identifier, createdAt: { gte: windowStart } },
  });

  if (recentFailures >= LOGIN_MAX_ATTEMPTS) {
    return {
      status: 'error',
      message: 'Too many failed attempts. Please try again in 15 minutes.',
    };
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { username: identifier }] },
    select: { id: true, passwordHash: true, timezone: true, timezoneAuto: true },
  });

  const passwordMatches = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

  if (!user || !passwordMatches) {
    await prisma.loginAttempt.create({ data: { identifier } });
    return { status: 'error', message: INVALID_CREDENTIALS };
  }

  await prisma.loginAttempt.deleteMany({ where: { identifier } });

  // First login from a browser sets the timezone, unless the user has since
  // chosen one themselves in Settings.
  if (user.timezoneAuto && timezone && isValidTimeZone(timezone) && timezone !== user.timezone) {
    await prisma.user.update({ where: { id: user.id }, data: { timezone } });
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  redirect(next ?? '/dashboard');
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect('/login');
}
