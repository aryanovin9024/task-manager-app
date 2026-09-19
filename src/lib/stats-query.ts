import { isIsoDate, type IsoDate } from '@/lib/dates';
import { isPeriodKind, type PeriodKind } from '@/lib/productivity';
import type { SearchParamsRecord } from '@/lib/task-filters';

export interface StatsQuery {
  period: PeriodKind;
  /** Undefined means "the current period in the viewer's timezone". */
  anchor?: IsoDate;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Reads `?period=weekly&anchor=2026-09-14` out of the URL. */
export function parseStatsQuery(params: SearchParamsRecord): StatsQuery {
  const period = first(params.period);
  const anchor = first(params.anchor);

  return {
    period: period && isPeriodKind(period) ? period : 'daily',
    anchor: anchor && isIsoDate(anchor) ? anchor : undefined,
  };
}

/** Builds the href for a tab or a step of the period picker. */
export function statsHref(basePath: string, query: StatsQuery): string {
  const params = new URLSearchParams();
  if (query.period !== 'daily') params.set('period', query.period);
  if (query.anchor) params.set('anchor', query.anchor);
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}
