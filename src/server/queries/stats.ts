import { parseIsoDate, toIsoDate } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { toPercent, type DateRange, type DayCount } from '@/lib/productivity';
import type { MemberDayCount, MemberPeriodStat, UserSummary } from '../types';

/**
 * Personal stats: one grouped query covering the whole chart window, for every
 * task assigned to the user across every project. The 30 bars (or 12 weeks, or
 * 12 months) are then folded out of this single result set in memory.
 */
export async function getPersonalDayCounts(
  userId: string,
  window: DateRange,
): Promise<DayCount[]> {
  const rows = await prisma.task.groupBy({
    by: ['dueDate', 'status'],
    where: {
      assigneeId: userId,
      dueDate: { gte: parseIsoDate(window.start), lte: parseIsoDate(window.end) },
    },
    _count: { _all: true },
  });

  const byDate = new Map<string, DayCount>();
  for (const row of rows) {
    const date = toIsoDate(row.dueDate);
    const bucket = byDate.get(date) ?? { date, total: 0, done: 0 };
    bucket.total += row._count._all;
    if (row.status === 'DONE') bucket.done += row._count._all;
    byDate.set(date, bucket);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Project stats: one grouped query that carries the assignee as well as the
 * due date, so the same result set feeds both the project-wide chart and the
 * per-member table. No query per bar and no query per member.
 *
 * The membership check is part of the `where` clause, so a non-member gets an
 * empty result rather than somebody else's numbers.
 */
export async function getProjectMemberDayCounts(
  projectId: string,
  userId: string,
  window: DateRange,
): Promise<MemberDayCount[]> {
  const rows = await prisma.task.groupBy({
    by: ['assigneeId', 'dueDate', 'status'],
    where: {
      projectId,
      project: { members: { some: { userId } } },
      dueDate: { gte: parseIsoDate(window.start), lte: parseIsoDate(window.end) },
    },
    _count: { _all: true },
  });

  const byKey = new Map<string, MemberDayCount>();
  for (const row of rows) {
    const date = toIsoDate(row.dueDate);
    const key = `${row.assigneeId ?? ''}|${date}`;
    const bucket = byKey.get(key) ?? { userId: row.assigneeId, date, total: 0, done: 0 };
    bucket.total += row._count._all;
    if (row.status === 'DONE') bucket.done += row._count._all;
    byKey.set(key, bucket);
  }

  return [...byKey.values()];
}

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
