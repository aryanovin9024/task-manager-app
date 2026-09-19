import type * as React from 'react';
import { CalendarRange } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { formatIsoDate, type IsoDate } from '@/lib/dates';
import {
  SERIES_LENGTH,
  type PeriodKind,
  type ProductivitySummary,
  type SeriesPoint,
} from '@/lib/productivity';
import { PeriodPicker } from './period-picker';
import { PeriodTabs } from './period-tabs';
import { ProductivityChart } from './productivity-chart';
import { ProductivityHeadline } from './productivity-headline';

const PERIOD_NOUNS: Record<PeriodKind, string> = {
  daily: 'Day',
  weekly: 'Week',
  monthly: 'Month',
};

const BUCKET_NOUNS: Record<PeriodKind, string> = {
  daily: 'days',
  weekly: 'weeks',
  monthly: 'months',
};

export interface StatsViewProps {
  /** The route the tabs and the picker link back to. */
  basePath: string;
  period: PeriodKind;
  /** Normalised anchor of the selected period. */
  anchor: IsoDate;
  /** True when the selected period is the current one — blocks paging forward. */
  atCurrent: boolean;
  summary: ProductivitySummary;
  series: SeriesPoint[];
  rangeLabel: string;
  /** Rendered under the chart — the project page passes the member table. */
  children?: React.ReactNode;
}

/**
 * The shared productivity view: period tabs, the headline number for the
 * selected period, the period stepper, and the trend chart behind it. Every
 * number is computed on the server by `@/lib/productivity`.
 */
export function StatsView({
  basePath,
  period,
  anchor,
  atCurrent,
  summary,
  series,
  rangeLabel,
  children,
}: StatsViewProps) {
  const windowEnd = series.length > 0 ? series[series.length - 1].range.end : null;
  // A window where nothing at all was due charts as a row of flat bars, which
  // reads as broken. Say so instead.
  const hasHistory = series.some((point) => point.total > 0);

  return (
    <div className="space-y-4">
      <PeriodTabs basePath={basePath} period={period} />

      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <ProductivityHeadline
              summary={summary}
              rangeLabel={rangeLabel}
              periodNoun={PERIOD_NOUNS[period]}
            />
            <PeriodPicker
              basePath={basePath}
              period={period}
              anchor={anchor}
              atCurrent={atCurrent}
              rangeLabel={rangeLabel}
            />
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">
              Last {SERIES_LENGTH[period]} {BUCKET_NOUNS[period]}
              {windowEnd ? ` to ${formatIsoDate(windowEnd)}` : ''}
            </p>
            {hasHistory ? (
              <ProductivityChart series={series} periodKind={period} />
            ) : (
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarRange />
                  </EmptyMedia>
                  <EmptyTitle>Nothing due yet</EmptyTitle>
                  <EmptyDescription>
                    No tasks fell in the last {SERIES_LENGTH[period]} {BUCKET_NOUNS[period]}, so
                    there is no trend to chart. Give a task a due date and it will show up here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
