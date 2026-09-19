import Link from 'next/link';
import { PERIOD_KINDS, type PeriodKind } from '@/lib/productivity';
import { statsHref } from '@/lib/stats-query';
import { cn } from '@/lib/utils';

const PERIOD_LABELS: Record<PeriodKind, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export interface PeriodTabsProps {
  /** The route the tabs link back to, e.g. `/dashboard`. */
  basePath: string;
  period: PeriodKind;
}

/**
 * Tab-styled *links* rather than client-side tab state: the period lives in the
 * URL so the server can do the aggregation. Switching tabs drops the anchor,
 * which lands the viewer back on the current period.
 */
export function PeriodTabs({ basePath, period }: PeriodTabsProps) {
  return (
    <nav
      aria-label="Productivity period"
      className="bg-muted grid w-full grid-cols-3 gap-1 rounded-lg p-[3px] sm:inline-grid sm:w-auto"
    >
      {PERIOD_KINDS.map((kind) => {
        const active = kind === period;
        return (
          <Link
            key={kind}
            href={statsHref(basePath, { period: kind, anchor: undefined })}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'focus-visible:border-ring focus-visible:ring-ring/50 inline-flex h-7 items-center justify-center rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-none sm:px-6',
              active
                ? 'bg-background text-foreground dark:border-input dark:bg-input/30 shadow-sm'
                : 'text-foreground/60 hover:text-foreground dark:text-muted-foreground',
            )}
          >
            {PERIOD_LABELS[kind]}
          </Link>
        );
      })}
    </nav>
  );
}
