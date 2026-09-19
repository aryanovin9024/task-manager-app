/**
 * Calendar-date utilities.
 *
 * A task's `dueDate` is a calendar date (Postgres `DATE`), not an instant.
 * Prisma hands those back as a JS `Date` pinned to UTC midnight, so every
 * helper here reads/writes UTC components: a due date of 2026-09-19 is the
 * 19th for every viewer, no matter what timezone they are in.
 *
 * Timezones only decide *which calendar date "now" is*, which is what
 * `todayInTimeZone` is for.
 */

/** A calendar date in `YYYY-MM-DD` form. */
export type IsoDate = string;

/** 0 = Sunday … 6 = Saturday. */
export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  return ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Parses `YYYY-MM-DD` into a `Date` at UTC midnight. */
export function parseIsoDate(date: IsoDate): Date {
  if (!ISO_DATE_RE.test(date)) {
    throw new RangeError(`Invalid ISO date: ${date}`);
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid ISO date: ${date}`);
  }
  return parsed;
}

/** Formats a `Date` as `YYYY-MM-DD` using its UTC components. */
export function toIsoDate(date: Date): IsoDate {
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The calendar date that `instant` falls on for someone in `timeZone`.
 * Falls back to UTC if the runtime rejects the timezone identifier.
 */
export function todayInTimeZone(instant: Date, timeZone: string): IsoDate {
  const formatter = safeFormatter(timeZone);
  const parts = formatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  const year = get('year').padStart(4, '0');
  const month = get('month').padStart(2, '0');
  const day = get('day').padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function safeFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }
  formatterCache.set(timeZone, formatter);
  return formatter;
}

/** True when the runtime recognises the IANA identifier. */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function addDays(date: IsoDate, amount: number): IsoDate {
  const value = parseIsoDate(date);
  value.setUTCDate(value.getUTCDate() + amount);
  return toIsoDate(value);
}

export function addMonths(date: IsoDate, amount: number): IsoDate {
  const value = parseIsoDate(date);
  const targetMonth = value.getUTCMonth() + amount;
  const anchor = new Date(Date.UTC(value.getUTCFullYear(), targetMonth, 1));
  const lastDay = daysInMonth(anchor.getUTCFullYear(), anchor.getUTCMonth());
  anchor.setUTCDate(Math.min(value.getUTCDate(), lastDay));
  return toIsoDate(anchor);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function startOfWeek(date: IsoDate, weekStartsOn: WeekDay): IsoDate {
  const value = parseIsoDate(date);
  const diff = (value.getUTCDay() - weekStartsOn + 7) % 7;
  return addDays(date, -diff);
}

export function endOfWeek(date: IsoDate, weekStartsOn: WeekDay): IsoDate {
  return addDays(startOfWeek(date, weekStartsOn), 6);
}

export function startOfMonth(date: IsoDate): IsoDate {
  const value = parseIsoDate(date);
  return toIsoDate(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)));
}

export function endOfMonth(date: IsoDate): IsoDate {
  const value = parseIsoDate(date);
  return toIsoDate(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)));
}

/** -1, 0 or 1 — safe because ISO dates sort lexicographically. */
export function compareIsoDate(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isWithin(date: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return date >= start && date <= end;
}

/** Inclusive list of every calendar date from `start` to `end`. */
export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** e.g. `19 Sep 2026` — deliberately locale-independent so SSR and the client agree. */
export function formatIsoDate(date: IsoDate): string {
  const value = parseIsoDate(date);
  const month = MONTH_NAMES[value.getUTCMonth()].slice(0, 3);
  return `${value.getUTCDate()} ${month} ${value.getUTCFullYear()}`;
}

export function formatIsoMonth(date: IsoDate): string {
  const value = parseIsoDate(date);
  return `${MONTH_NAMES[value.getUTCMonth()]} ${value.getUTCFullYear()}`;
}

export function formatIsoDateShort(date: IsoDate): string {
  const value = parseIsoDate(date);
  return `${value.getUTCDate()} ${MONTH_NAMES[value.getUTCMonth()].slice(0, 3)}`;
}
