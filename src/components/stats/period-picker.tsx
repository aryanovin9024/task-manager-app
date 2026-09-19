import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WEEK_STARTS_ON } from '@/lib/config';
import type { IsoDate } from '@/lib/dates';
import { shiftAnchor, type PeriodKind } from '@/lib/productivity';
import { statsHref } from '@/lib/stats-query';

const PREVIOUS_LABELS: Record<PeriodKind, string> = {
  daily: 'Previous day',
  weekly: 'Previous week',
  monthly: 'Previous month',
};

const NEXT_LABELS: Record<PeriodKind, string> = {
  daily: 'Next day',
  weekly: 'Next week',
  monthly: 'Next month',
};

const CURRENT_LABELS: Record<PeriodKind, string> = {
  daily: 'Today',
  weekly: 'This week',
  monthly: 'This month',
};

export interface PeriodPickerProps {
  basePath: string;
  period: PeriodKind;
  /** Already normalised to the first day of its period. */
  anchor: IsoDate;
  /** True when `anchor` sits in the current period — "next" is then disabled. */
  atCurrent: boolean;
  rangeLabel: string;
}

/** Steps one whole period back or forward; never past the current period. */
export function PeriodPicker({
  basePath,
  period,
  anchor,
  atCurrent,
  rangeLabel,
}: PeriodPickerProps) {
  const previousHref = statsHref(basePath, {
    period,
    anchor: shiftAnchor(period, anchor, -1, WEEK_STARTS_ON),
  });
  const nextHref = statsHref(basePath, {
    period,
    anchor: shiftAnchor(period, anchor, 1, WEEK_STARTS_ON),
  });

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="icon">
          <Link href={previousHref} aria-label={PREVIOUS_LABELS[period]}>
            <ChevronLeft aria-hidden="true" />
          </Link>
        </Button>

        <span className="text-sm font-medium whitespace-nowrap">{rangeLabel}</span>

        {atCurrent ? (
          <Button variant="outline" size="icon" disabled aria-label={NEXT_LABELS[period]}>
            <ChevronRight aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon">
            <Link href={nextHref} aria-label={NEXT_LABELS[period]}>
              <ChevronRight aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>

      {atCurrent ? null : (
        <Button asChild variant="ghost" size="xs" className="text-muted-foreground">
          <Link href={statsHref(basePath, { period, anchor: undefined })}>
            {CURRENT_LABELS[period]}
          </Link>
        </Button>
      )}
    </div>
  );
}
