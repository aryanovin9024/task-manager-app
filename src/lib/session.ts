import { createHmac, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  SESSION_REFRESH_THRESHOLD_MS,
} from './session-constants';
import { env } from './env';
import { prisma } from './prisma';

export interface SessionUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  timezone: string;
  timezoneAuto: boolean;
}

/**
 * The cookie holds a random token; the database only ever stores its HMAC.
 * A leaked database dump therefore cannot be replayed as a login.
 */
function sessionIdFromToken(token: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(token).digest('hex');
}

function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({
    data: { id: sessionIdFromToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

/** Destroys the current session server-side and drops the cookie. */
export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { id: sessionIdFromToken(token) } });
  }
  await clearSessionCookie();
}

/**
 * Resolves the signed-in user for the current request.
 * Memoised per request with React `cache`, so calling it in a layout and in a
 * page costs a single query.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: sessionIdFromToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          timezone: true,
          timezoneAuto: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }

  // Sliding expiry: once a session is past the halfway mark, push it out to a
  // full 30 days again. The cookie itself is slid forward by middleware.
  if (session.expiresAt.getTime() - Date.now() < SESSION_REFRESH_THRESHOLD_MS) {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + SESSION_DURATION_MS) },
    });
  }

  return session.user;
});

/** Guard for every authenticated page and server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
