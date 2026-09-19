/**
 * Productivity maths. Everything in this file is pure — no I/O, no clock, no
 * database — so it can be unit tested exhaustively and reused on the server
 * and the client.
 *
 * Definition (see README / DECISIONS.md):
 *   productivity % for a period
 *     = tasks whose dueDate falls in the period AND status = DONE
 *     ÷ tasks whose dueDate falls in the period
 *     × 100, rounded to one decimal.
 *   A period with no tasks has no percentage at all — it renders as "—",
 *   never as 0%.
 */

import {
  addDays,
  addMonths,
  compareIsoDate,
  endOfMonth,
  endOfWeek,
  formatIsoDate,
  formatIsoDateShort,
  formatIsoMonth,
  startOfMonth,
  startOfWeek,
  todayInTimeZone,
  toIsoDate,
  type IsoDate,
  type WeekDay,
} from './dates';

export type PeriodKind = 'daily' | 'weekly' | 'monthly';

export const PERIOD_KINDS: readonly PeriodKind[] = ['daily', 'weekly', 'monthly'] as const;

export function isPeriodKind(value: string): value is PeriodKind {
  return (PERIOD_KINDS as readonly string[]).includes(value);
}

/** Inclusive calendar-date range. */
export interface DateRange {
  start: IsoDate;
  end: IsoDate;
}

/** Pre-aggregated per-day task counts, as produced by a single grouped query. */
export interface DayCount {
  date: IsoDate;
  total: number;
  done: number;
}

export interface ProductivitySummary {
  done: number;
  total: number;
  /** `null` when `total` is 0 — the caller renders "—". */
  percent: number | null;
}

export interface SeriesPoint extends ProductivitySummary {
  range: DateRange;
  /** Stable key for React lists and chart x-axes. */
  key: IsoDate;
  /** Short axis label, e.g. `19 Sep`. */
  label: string;
  /** Full label used in tooltips, e.g. `15 Sep 2026 – 21 Sep 2026`. */
  fullLabel: string;
}

/* -------------------------------------------------------------------------- */
/* Core calculation                                                           */
/* -------------------------------------------------------------------------- */

/** Rounds a ratio to a one-decimal percentage. */
export function toPercent(done: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((done / total) * 1000) / 10;
}

/**
 * The one function the whole feature hangs off: fold per-day counts that fall
 * inside `range` into a single summary.
 */
export function summarize(days: readonly DayCount[], range: DateRange): ProductivitySummary {
  let done = 0;
  let total = 0;
  for (const day of days) {
    if (day.date < range.start || day.date > range.end) continue;
    total += day.total;
    done += day.done;
  }
  return { done, total, percent: toPercent(done, total) };
}

/** Collapses raw tasks into per-day counts. Handy for tests and small lists. */
export function tasksToDayCounts(
  tasks: readonly { dueDate: Date | IsoDate; status: 'TODO' | 'DONE' }[],
): DayCount[] {
  const byDate = new Map<IsoDate, DayCount>();
  for (const task of tasks) {
    const date = typeof task.dueDate === 'string' ? task.dueDate : toIsoDate(task.dueDate);
    const bucket = byDate.get(date) ?? { date, total: 0, done: 0 };
    bucket.total += 1;
    if (task.status === 'DONE') bucket.done += 1;
    byDate.set(date, bucket);
  }
  return [...byDate.values()].sort((a, b) => compareIsoDate(a.date, b.date));
}

/* -------------------------------------------------------------------------- */
/* Period boundaries                                                          */
/* -------------------------------------------------------------------------- */

/** The calendar date "now" falls on for a viewer in `timeZone`. */
export function currentDate(now: Date, timeZone: string): IsoDate {
  return todayInTimeZone(now, timeZone);
}

/** The inclusive range of the period that `anchor` sits inside. */
export function periodRange(
  kind: PeriodKind,
  anchor: IsoDate,
  weekStartsOn: WeekDay,
): DateRange {
  switch (kind) {
    case 'daily':
      return { start: anchor, end: anchor };
    case 'weekly':
      return { start: startOfWeek(anchor, weekStartsOn), end: endOfWeek(anchor, weekStartsOn) };
    case 'monthly':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  }
}

/** Steps an anchor date forwards/backwards by whole periods. */
export function shiftAnchor(
  kind: PeriodKind,
  anchor: IsoDate,
  steps: number,
  weekStartsOn: WeekDay,
): IsoDate {
  switch (kind) {
    case 'daily':
      return addDays(anchor, steps);
    case 'weekly':
      return startOfWeek(addDays(startOfWeek(anchor, weekStartsOn), steps * 7), weekStartsOn);
    case 'monthly':
      return startOfMonth(addMonths(startOfMonth(anchor), steps));
  }
}

/** Normalises an anchor to the first day of its period, so keys are stable. */
export function normalizeAnchor(
  kind: PeriodKind,
  anchor: IsoDate,
  weekStartsOn: WeekDay,
): IsoDate {
  return periodRange(kind, anchor, weekStartsOn).start;
}

/** How many buckets each chart shows. */
export const SERIES_LENGTH: Record<PeriodKind, number> = {
  daily: 30,
  weekly: 12,
  monthly: 12,
};

/** The last `count` period ranges, oldest first, ending with `anchor`'s period. */
export function seriesRanges(
  kind: PeriodKind,
  anchor: IsoDate,
  count: number,
  weekStartsOn: WeekDay,
): DateRange[] {
  const ranges: DateRange[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const shifted = shiftAnchor(kind, anchor, -offset, weekStartsOn);
    ranges.push(periodRange(kind, shifted, weekStartsOn));
  }
  return ranges;
}

/** Builds the bar-chart series: one point per period, each with its own %. */
export function buildSeries(
  kind: PeriodKind,
  days: readonly DayCount[],
  anchor: IsoDate,
  weekStartsOn: WeekDay,
  count: number = SERIES_LENGTH[kind],
): SeriesPoint[] {
  return seriesRanges(kind, anchor, count, weekStartsOn).map((range) => ({
    ...summarize(days, range),
    range,
    key: range.start,
    label: seriesLabel(kind, range),
    fullLabel: periodLabel(kind, range),
  }));
}

function seriesLabel(kind: PeriodKind, range: DateRange): string {
  switch (kind) {
    case 'daily':
      return formatIsoDateShort(range.start);
    case 'weekly':
      return formatIsoDateShort(range.start);
    case 'monthly':
      return formatIsoMonth(range.start).slice(0, 3) + ' ' + range.start.slice(2, 4);
  }
}

/** Human label for a period, used in headings and tooltips. */
export function periodLabel(kind: PeriodKind, range: DateRange): string {
  switch (kind) {
    case 'daily':
      return formatIsoDate(range.start);
    case 'weekly':
      return `${formatIsoDate(range.start)} – ${formatIsoDate(range.end)}`;
    case 'monthly':
      return formatIsoMonth(range.start);
  }
}

/** The widest range a view needs, i.e. the whole chart window. */
export function seriesWindow(
  kind: PeriodKind,
  anchor: IsoDate,
  weekStartsOn: WeekDay,
  count: number = SERIES_LENGTH[kind],
): DateRange {
  const ranges = seriesRanges(kind, anchor, count, weekStartsOn);
  return { start: ranges[0].start, end: ranges[ranges.length - 1].end };
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

/** `72.5%`, or `—` when there is nothing to measure. */
export function formatPercent(percent: number | null): string {
  if (percent === null) return '—';
  return `${percent.toFixed(1)}%`;
}

/** `14 / 20 done` — always shown next to the percentage. */
export function formatCounts(done: number, total: number): string {
  return `${done} / ${total} done`;
}
