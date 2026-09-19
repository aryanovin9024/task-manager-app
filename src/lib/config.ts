import { env } from './env';
import type { WeekDay } from './dates';

export {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  SESSION_DURATION_SECONDS,
  SESSION_REFRESH_THRESHOLD_MS,
} from './session-constants';

/**
 * The single source of truth for the first day of the week. Every weekly
 * productivity boundary in the app is derived from this constant.
 * 0 = Sunday … 6 = Saturday. Configurable via the WEEK_STARTS_ON env var.
 */
export const WEEK_STARTS_ON: WeekDay = env.WEEK_STARTS_ON as WeekDay;

/** Login rate limit: 5 failures per identifier per 15 minutes. */
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

/** Routes reachable without a session. Everything else is behind the guard. */
export const PUBLIC_ROUTES = ['/login', '/signup'] as const;
