import { WEEK_STARTS_ON } from '@/lib/config';
import type { IsoDate } from '@/lib/dates';
import {
  currentDate,
  normalizeAnchor,
  periodLabel,
  periodRange,
  seriesWindow,
  type DateRange,
  type PeriodKind,
} from '@/lib/productivity';

export interface ResolvedPeriod {
  /** Normalised to the first day of its period, never later than the current one. */
  anchor: IsoDate;
  /** True when the selected period is the current one — blocks paging forward. */
  atCurrent: boolean;
  /** The selected period itself — what the headline number is measured over. */
  range: DateRange;
  /** The whole chart window, i.e. the range a single stats query has to cover. */
  window: DateRange;
  /** Human label for `range`, from `periodLabel`. */
  rangeLabel: string;
}

/**
 * Turns the period + optional anchor from the URL into everything both stats
 * pages need. An anchor in the future (hand-typed, or a stale link) is clamped
 * back to the current period, so the view can never get stranded on empty
 * future buckets with "next" disabled and no way home.
 */
export function resolvePeriod(
  period: PeriodKind,
  requestedAnchor: IsoDate | undefined,
  timezone: string,
  now: Date = new Date(),
): ResolvedPeriod {
  const currentAnchor = normalizeAnchor(period, currentDate(now, timezone), WEEK_STARTS_ON);
  const requested = requestedAnchor
    ? normalizeAnchor(period, requestedAnchor, WEEK_STARTS_ON)
    : currentAnchor;
  const anchor = requested > currentAnchor ? currentAnchor : requested;
  const range = periodRange(period, anchor, WEEK_STARTS_ON);

  return {
    anchor,
    atCurrent: anchor === currentAnchor,
    range,
    window: seriesWindow(period, anchor, WEEK_STARTS_ON),
    rangeLabel: periodLabel(period, range),
  };
}
