/**
 * Pure folding helpers that turn the rows of the single grouped stats query
 * into the shapes the two stats views render. Kept out of the query module so
 * they can be unit tested without a database.
 */
import { toPercent, type DateRange, type DayCount } from './productivity';
import type { MemberDayCount, MemberPeriodStat, UserSummary } from '@/server/types';

/** Collapses the per-member rows into project-wide per-day counts. */
export function foldToDayCounts(rows: readonly MemberDayCount[]): DayCount[] {
  const byDate = new Map<string, DayCount>();
  for (const row of rows) {
    const bucket = byDate.get(row.date) ?? { date: row.date, total: 0, done: 0 };
    bucket.total += row.total;
    bucket.done += row.done;
    byDate.set(row.date, bucket);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The per-member table for one period. Every member is listed, including those
 * with nothing due (who show "—"), plus an "Unassigned" row when the project
 * has unassigned work in the period.
 *
 * Sorted by percentage descending; members with no tasks due sort last.
 */
export function buildMemberStats(
  rows: readonly MemberDayCount[],
  range: DateRange,
  members: readonly UserSummary[],
): MemberPeriodStat[] {
  const totals = new Map<string, { done: number; total: number }>();

  for (const row of rows) {
    if (row.date < range.start || row.date > range.end) continue;
    const key = row.userId ?? '';
    const bucket = totals.get(key) ?? { done: 0, total: 0 };
    bucket.done += row.done;
    bucket.total += row.total;
    totals.set(key, bucket);
  }

  const stats: MemberPeriodStat[] = members.map((member) => {
    const bucket = totals.get(member.id) ?? { done: 0, total: 0 };
    return {
      user: member,
      done: bucket.done,
      total: bucket.total,
      percent: toPercent(bucket.done, bucket.total),
    };
  });

  const unassigned = totals.get('');
  if (unassigned && unassigned.total > 0) {
    stats.push({
      user: null,
      done: unassigned.done,
      total: unassigned.total,
      percent: toPercent(unassigned.done, unassigned.total),
    });
  }

  return stats.sort((a, b) => {
    if (a.percent === null && b.percent === null) return compareNames(a, b);
    if (a.percent === null) return 1;
    if (b.percent === null) return -1;
    if (b.percent !== a.percent) return b.percent - a.percent;
    if (b.done !== a.done) return b.done - a.done;
    return compareNames(a, b);
  });
}

function compareNames(a: MemberPeriodStat, b: MemberPeriodStat): number {
  const left = a.user?.displayName ?? 'Unassigned';
  const right = b.user?.displayName ?? 'Unassigned';
  return left.localeCompare(right);
}
