import { describe, expect, it } from 'vitest';
import { buildMemberStats, foldToDayCounts } from './stats-fold';
import type { MemberDayCount, UserSummary } from '@/server/types';

const ada: UserSummary = { id: 'u_ada', username: 'ada', displayName: 'Ada Lovelace' };
const grace: UserSummary = { id: 'u_grace', username: 'grace', displayName: 'Grace Hopper' };
const alan: UserSummary = { id: 'u_alan', username: 'alan', displayName: 'Alan Turing' };

const WEEK = { start: '2026-09-14', end: '2026-09-20' };

function row(userId: string | null, date: string, total: number, done: number): MemberDayCount {
  return { userId, date, total, done };
}

describe('foldToDayCounts', () => {
  it('sums every member onto the same day', () => {
    const rows = [
      row(ada.id, '2026-09-15', 3, 2),
      row(grace.id, '2026-09-15', 2, 0),
      row(null, '2026-09-15', 1, 1),
      row(ada.id, '2026-09-14', 1, 1),
    ];
    expect(foldToDayCounts(rows)).toEqual([
      { date: '2026-09-14', total: 1, done: 1 },
      { date: '2026-09-15', total: 6, done: 3 },
    ]);
  });

  it('returns an empty list for no rows', () => {
    expect(foldToDayCounts([])).toEqual([]);
  });
});

describe('buildMemberStats', () => {
  it('sorts by percentage descending', () => {
    const rows = [
      row(ada.id, '2026-09-15', 4, 4), // 100%
      row(grace.id, '2026-09-15', 4, 1), // 25%
      row(alan.id, '2026-09-16', 2, 1), // 50%
    ];
    const stats = buildMemberStats(rows, WEEK, [grace, alan, ada]);
    expect(stats.map((stat) => [stat.user?.username, stat.percent])).toEqual([
      ['ada', 100],
      ['alan', 50],
      ['grace', 25],
    ]);
  });

  it('lists members with nothing due, showing no percentage, and sorts them last', () => {
    const rows = [row(ada.id, '2026-09-15', 2, 0)]; // 0% — still ahead of "no data"
    const stats = buildMemberStats(rows, WEEK, [ada, grace]);
    expect(stats).toEqual([
      { user: ada, done: 0, total: 2, percent: 0 },
      { user: grace, done: 0, total: 0, percent: null },
    ]);
  });

  it('ignores rows outside the selected period', () => {
    const rows = [
      row(ada.id, '2026-09-13', 10, 10), // the day before the week
      row(ada.id, '2026-09-21', 10, 10), // the day after
      row(ada.id, '2026-09-20', 2, 1), // inside
    ];
    expect(buildMemberStats(rows, WEEK, [ada])).toEqual([
      { user: ada, done: 1, total: 2, percent: 50 },
    ]);
  });

  it('adds an Unassigned row only when there is unassigned work in the period', () => {
    const withUnassigned = buildMemberStats(
      [row(ada.id, '2026-09-15', 1, 1), row(null, '2026-09-16', 2, 1)],
      WEEK,
      [ada],
    );
    expect(withUnassigned.map((stat) => stat.user?.displayName ?? 'Unassigned')).toEqual([
      'Ada Lovelace',
      'Unassigned',
    ]);

    const outsideThePeriod = buildMemberStats(
      [row(ada.id, '2026-09-15', 1, 1), row(null, '2026-09-30', 2, 1)],
      WEEK,
      [ada],
    );
    expect(outsideThePeriod).toHaveLength(1);
  });

  it('breaks ties on done count, then on name', () => {
    const rows = [
      row(ada.id, '2026-09-15', 2, 1), // 50%, 1 done
      row(grace.id, '2026-09-15', 4, 2), // 50%, 2 done
      row(alan.id, '2026-09-15', 2, 1), // 50%, 1 done
    ];
    const stats = buildMemberStats(rows, WEEK, [alan, grace, ada]);
    // grace leads on done count; the remaining tie breaks on display name,
    // where "Ada Lovelace" sorts before "Alan Turing".
    expect(stats.map((stat) => stat.user?.username)).toEqual(['grace', 'ada', 'alan']);
  });

  it('handles a project where nothing at all was due', () => {
    const stats = buildMemberStats([], WEEK, [ada, grace]);
    expect(stats.every((stat) => stat.percent === null && stat.total === 0)).toBe(true);
    expect(stats).toHaveLength(2);
  });
});
