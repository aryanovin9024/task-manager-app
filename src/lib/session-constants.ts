/**
 * Session constants with no dependencies, so they can be imported from the
 * Edge middleware as well as from Node server code.
 */
export const SESSION_COOKIE_NAME = 'taskmanager_session';

/** Sessions live 30 days and slide forward whenever they are used. */
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export const SESSION_DURATION_SECONDS = SESSION_DURATION_MS / 1000;

/** A session is extended once it is more than halfway through its life. */
export const SESSION_REFRESH_THRESHOLD_MS = SESSION_DURATION_MS / 2;
