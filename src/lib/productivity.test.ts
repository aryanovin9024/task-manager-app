import { describe, expect, it } from 'vitest';
import {
  buildSeries,
  currentDate,
  formatCounts,
  formatPercent,
  normalizeAnchor,
  periodLabel,
  periodRange,
  seriesRanges,
  seriesWindow,
  shiftAnchor,
  summarize,
  tasksToDayCounts,
  toPercent,
  type DayCount,
} from './productivity';
import { addDays, todayInTimeZone } from './dates';

const MONDAY_START = 1;
const SUNDAY_START = 0;
const SATURDAY_START = 6;

/** Helper: N tasks on a date, `done` of which are complete. */
function day(date: string, total: number, done: number): DayCount {
  return { date, total, done };
}

describe('toPercent', () => {
  it('returns null when there is nothing to measure', () => {
    expect(toPercent(0, 0)).toBeNull();
    expect(toPercent(0, -1)).toBeNull();
  });

  it('rounds to exactly one decimal place', () => {
    expect(toPercent(1, 3)).toBe(33.3);
    expect(toPercent(2, 3)).toBe(66.7);
    expect(toPercent(7, 9)).toBe(77.8);
    expect(toPercent(14, 20)).toBe(70);
    expect(toPercent(1, 8)).toBe(12.5);
  });

  it('handles the extremes', () => {
    expect(toPercent(0, 5)).toBe(0);
    expect(toPercent(5, 5)).toBe(100);
  });
});

describe('summarize', () => {
  const range = { start: '2026-09-14', end: '2026-09-20' };

  it('empty period → no percentage at all, never 0%', () => {
    const result = summarize([], range);
    expect(result).toEqual({ done: 0, total: 0, percent: null });
    expect(formatPercent(result.percent)).toBe('—');
  });

  it('empty period still reports null when tasks exist entirely outside it', () => {
    const outside = [day('2026-09-13', 4, 4), day('2026-09-21', 3, 0)];
    expect(summarize(outside, range)).toEqual({ done: 0, total: 0, percent: null });
  });

  it('all done → 100%', () => {
    const days = [day('2026-09-14', 3, 3), day('2026-09-18', 2, 2)];
    expect(summarize(days, range)).toEqual({ done: 5, total: 5, percent: 100 });
  });

  it('none done → 0%, which is different from "—"', () => {
    const days = [day('2026-09-14', 3, 0), day('2026-09-18', 2, 0)];
    const result = summarize(days, range);
    expect(result).toEqual({ done: 0, total: 5, percent: 0 });
    expect(formatPercent(result.percent)).toBe('0.0%');
  });

  it('mixed → one-decimal percentage with raw counts', () => {
    const days = [day('2026-09-14', 10, 7), day('2026-09-20', 10, 7)];
    const result = summarize(days, range);
    expect(result).toEqual({ done: 14, total: 20, percent: 70 });
    expect(formatCounts(result.done, result.total)).toBe('14 / 20 done');
  });

  it('includes both inclusive boundaries and excludes the days either side', () => {
    const days = [
      day('2026-09-13', 5, 5), // day before — excluded
      day('2026-09-14', 1, 1), // first day — included
      day('2026-09-20', 1, 0), // last day — included
      day('2026-09-21', 5, 5), // day after — excluded
    ];
    expect(summarize(days, range)).toEqual({ done: 1, total: 2, percent: 50 });
  });
});

describe('tasksToDayCounts', () => {
  it('buckets tasks by their calendar due date', () => {
    const counts = tasksToDayCounts([
      { dueDate: '2026-09-19', status: 'DONE' },
      { dueDate: '2026-09-19', status: 'TODO' },
      { dueDate: '2026-09-18', status: 'DONE' },
    ]);
    expect(counts).toEqual([day('2026-09-18', 1, 1), day('2026-09-19', 2, 1)]);
  });

  it('reads a Postgres DATE (UTC midnight) without shifting the day', () => {
    const counts = tasksToDayCounts([
      { dueDate: new Date('2026-09-19T00:00:00.000Z'), status: 'DONE' },
    ]);
    expect(counts).toEqual([day('2026-09-19', 1, 1)]);
  });
});

describe('period boundaries', () => {
  it('daily period is a single day', () => {
    expect(periodRange('daily', '2026-09-19', MONDAY_START)).toEqual({
      start: '2026-09-19',
      end: '2026-09-19',
    });
  });

  it('monthly period spans the whole calendar month', () => {
    expect(periodRange('monthly', '2026-09-19', MONDAY_START)).toEqual({
      start: '2026-09-01',
      end: '2026-09-30',
    });
  });

  it('monthly period handles February in a leap year', () => {
    expect(periodRange('monthly', '2028-02-10', MONDAY_START)).toEqual({
      start: '2028-02-01',
      end: '2028-02-29',
    });
  });

  describe('week boundary', () => {
    // 2026-09-19 is a Saturday.
    it('WEEK_STARTS_ON=Monday puts Saturday 19 Sep in the 14–20 Sep week', () => {
      expect(periodRange('weekly', '2026-09-19', MONDAY_START)).toEqual({
        start: '2026-09-14',
        end: '2026-09-20',
      });
    });

    it('the Monday itself starts its own week, the Sunday ends it', () => {
      expect(periodRange('weekly', '2026-09-14', MONDAY_START).start).toBe('2026-09-14');
      expect(periodRange('weekly', '2026-09-20', MONDAY_START).end).toBe('2026-09-20');
      // One day either side lands in a neighbouring week.
      expect(periodRange('weekly', '2026-09-13', MONDAY_START)).toEqual({
        start: '2026-09-07',
        end: '2026-09-13',
      });
      expect(periodRange('weekly', '2026-09-21', MONDAY_START)).toEqual({
        start: '2026-09-21',
        end: '2026-09-27',
      });
    });

    it('WEEK_STARTS_ON=Sunday shifts the same date into 13–19 Sep', () => {
      expect(periodRange('weekly', '2026-09-19', SUNDAY_START)).toEqual({
        start: '2026-09-13',
        end: '2026-09-19',
      });
    });

    it('WEEK_STARTS_ON=Saturday makes 19 Sep the first day of its week', () => {
      expect(periodRange('weekly', '2026-09-19', SATURDAY_START)).toEqual({
        start: '2026-09-19',
        end: '2026-09-25',
      });
    });

    it('a task on the boundary counts in exactly one week', () => {
      const days = [day('2026-09-20', 4, 3)]; // Sunday
      const thisWeek = periodRange('weekly', '2026-09-19', MONDAY_START);
      const nextWeek = periodRange('weekly', '2026-09-21', MONDAY_START);
      expect(summarize(days, thisWeek)).toEqual({ done: 3, total: 4, percent: 75 });
      expect(summarize(days, nextWeek)).toEqual({ done: 0, total: 0, percent: null });
    });

    it('week boundaries cross a month end cleanly', () => {
      expect(periodRange('weekly', '2026-10-01', MONDAY_START)).toEqual({
        start: '2026-09-28',
        end: '2026-10-04',
      });
    });
  });
});

describe('timezone boundaries', () => {
  // 23:59 on 19 Sep 2026 in Tehran (UTC+03:30) is 20:29 UTC on the same day,
  // by which point it is already 20 Sep in Auckland (UTC+12).
  const lateEvening = new Date('2026-09-19T20:29:00.000Z');

  it('resolves "today" from the viewer timezone, not the server clock', () => {
    expect(currentDate(lateEvening, 'Asia/Tehran')).toBe('2026-09-19');
    expect(currentDate(lateEvening, 'UTC')).toBe('2026-09-19');
    expect(currentDate(lateEvening, 'America/Los_Angeles')).toBe('2026-09-19');
    expect(currentDate(lateEvening, 'Pacific/Auckland')).toBe('2026-09-20');
  });

  it('a task due 19 Sep is today in Tehran but yesterday in Auckland', () => {
    const days = [day('2026-09-19', 10, 6)];

    const tehranToday = periodRange('daily', currentDate(lateEvening, 'Asia/Tehran'), MONDAY_START);
    expect(summarize(days, tehranToday)).toEqual({ done: 6, total: 10, percent: 60 });

    const aucklandToday = periodRange(
      'daily',
      currentDate(lateEvening, 'Pacific/Auckland'),
      MONDAY_START,
    );
    expect(summarize(days, aucklandToday)).toEqual({ done: 0, total: 0, percent: null });
    expect(formatPercent(summarize(days, aucklandToday).percent)).toBe('—');
  });

  it('one minute later the day has also flipped in Tehran', () => {
    const justAfterMidnight = new Date('2026-09-19T20:30:00.000Z');
    expect(currentDate(justAfterMidnight, 'Asia/Tehran')).toBe('2026-09-20');
  });

  it('23:59 UTC is still the 19th in UTC and already the 20th in Auckland', () => {
    const utcLate = new Date('2026-09-19T23:59:00.000Z');
    expect(currentDate(utcLate, 'UTC')).toBe('2026-09-19');
    expect(currentDate(utcLate, 'Pacific/Auckland')).toBe('2026-09-20');
    expect(currentDate(utcLate, 'America/Los_Angeles')).toBe('2026-09-19');
  });

  it('the due date itself never moves, whatever timezone is viewing', () => {
    const stored = new Date('2026-09-19T00:00:00.000Z');
    for (const zone of ['UTC', 'Asia/Tehran', 'Pacific/Auckland', 'America/Los_Angeles']) {
      expect(tasksToDayCounts([{ dueDate: stored, status: 'TODO' }])[0].date).toBe('2026-09-19');
      // The viewer's zone only changes which day counts as "today".
      expect(todayInTimeZone(stored, zone)).toMatch(/^2026-09-(18|19)$/);
    }
  });

  it('falls back to UTC for an unusable timezone instead of throwing', () => {
    expect(currentDate(lateEvening, 'Not/AZone')).toBe('2026-09-19');
  });

  it('survives a DST transition in the viewer timezone', () => {
    // US DST ends 01 Nov 2026 at 02:00 local.
    const beforeFallBack = new Date('2026-11-01T08:30:00.000Z'); // 01:30 PDT
    const afterFallBack = new Date('2026-11-01T09:30:00.000Z'); // 01:30 PST
    expect(currentDate(beforeFallBack, 'America/Los_Angeles')).toBe('2026-11-01');
    expect(currentDate(afterFallBack, 'America/Los_Angeles')).toBe('2026-11-01');
  });
});

describe('period navigation', () => {
  it('steps days, weeks and months', () => {
    expect(shiftAnchor('daily', '2026-09-19', -1, MONDAY_START)).toBe('2026-09-18');
    expect(shiftAnchor('daily', '2026-09-19', 1, MONDAY_START)).toBe('2026-09-20');
    expect(shiftAnchor('weekly', '2026-09-19', -1, MONDAY_START)).toBe('2026-09-07');
    expect(shiftAnchor('weekly', '2026-09-19', 1, MONDAY_START)).toBe('2026-09-21');
    expect(shiftAnchor('monthly', '2026-09-19', -1, MONDAY_START)).toBe('2026-08-01');
    expect(shiftAnchor('monthly', '2026-01-15', -1, MONDAY_START)).toBe('2025-12-01');
  });

  it('normalises an anchor to the first day of its period', () => {
    expect(normalizeAnchor('daily', '2026-09-19', MONDAY_START)).toBe('2026-09-19');
    expect(normalizeAnchor('weekly', '2026-09-19', MONDAY_START)).toBe('2026-09-14');
    expect(normalizeAnchor('monthly', '2026-09-19', MONDAY_START)).toBe('2026-09-01');
  });

  it('labels each period readably', () => {
    expect(periodLabel('daily', periodRange('daily', '2026-09-19', MONDAY_START))).toBe(
      '19 Sep 2026',
    );
    expect(periodLabel('weekly', periodRange('weekly', '2026-09-19', MONDAY_START))).toBe(
      '14 Sep 2026 – 20 Sep 2026',
    );
    expect(periodLabel('monthly', periodRange('monthly', '2026-09-19', MONDAY_START))).toBe(
      'September 2026',
    );
  });
});

describe('chart series', () => {
  it('daily series covers 30 buckets ending on the anchor', () => {
    const ranges = seriesRanges('daily', '2026-09-19', 30, MONDAY_START);
    expect(ranges).toHaveLength(30);
    expect(ranges[0].start).toBe('2026-08-21');
    expect(ranges[29].start).toBe('2026-09-19');
    expect(seriesWindow('daily', '2026-09-19', MONDAY_START)).toEqual({
      start: '2026-08-21',
      end: '2026-09-19',
    });
  });

  it('weekly series covers 12 whole weeks', () => {
    const ranges = seriesRanges('weekly', '2026-09-19', 12, MONDAY_START);
    expect(ranges).toHaveLength(12);
    expect(ranges[11]).toEqual({ start: '2026-09-14', end: '2026-09-20' });
    expect(ranges[0]).toEqual({ start: '2026-06-29', end: '2026-07-05' });
  });

  it('monthly series covers 12 whole months', () => {
    const ranges = seriesRanges('monthly', '2026-09-19', 12, MONDAY_START);
    expect(ranges).toHaveLength(12);
    expect(ranges[11]).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(ranges[0]).toEqual({ start: '2025-10-01', end: '2025-10-31' });
  });

  it('each bar carries its own percentage and counts, with gaps left empty', () => {
    const days = [day('2026-09-19', 4, 1), day('2026-09-18', 2, 2)];
    const series = buildSeries('daily', days, '2026-09-19', MONDAY_START, 3);
    expect(series.map((point) => [point.key, point.done, point.total, point.percent])).toEqual([
      ['2026-09-17', 0, 0, null],
      ['2026-09-18', 2, 2, 100],
      ['2026-09-19', 1, 4, 25],
    ]);
    expect(series[0].label).toBe('17 Sep');
    expect(series[2].fullLabel).toBe('19 Sep 2026');
  });

  it('never double-counts a task across two buckets', () => {
    const days = Array.from({ length: 40 }, (_, index) =>
      day(addDays('2026-08-15', index), 1, index % 2 === 0 ? 1 : 0),
    );
    const series = buildSeries('daily', days, '2026-09-19', MONDAY_START, 30);
    const totalled = series.reduce((sum, point) => sum + point.total, 0);
    const window = seriesWindow('daily', '2026-09-19', MONDAY_START, 30);
    expect(totalled).toBe(summarize(days, window).total);
  });
});

describe('formatting', () => {
  it('renders an em dash when there is no percentage', () => {
    expect(formatPercent(null)).toBe('—');
  });

  it('always renders one decimal place', () => {
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(70)).toBe('70.0%');
    expect(formatPercent(33.3)).toBe('33.3%');
    expect(formatPercent(100)).toBe('100.0%');
  });

  it('shows raw counts next to the percentage', () => {
    expect(formatCounts(14, 20)).toBe('14 / 20 done');
    expect(formatCounts(0, 0)).toBe('0 / 0 done');
  });
});
