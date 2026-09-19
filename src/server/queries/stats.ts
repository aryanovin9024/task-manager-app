import { parseIsoDate, toIsoDate } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import type { DateRange, DayCount } from '@/lib/productivity';
import type { MemberDayCount } from '../types';

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

// The pure folding of those rows lives in @/lib/stats-fold so it can be unit
// tested without a database; re-exported here so callers have one import.
export { buildMemberStats, foldToDayCounts } from '@/lib/stats-fold';
