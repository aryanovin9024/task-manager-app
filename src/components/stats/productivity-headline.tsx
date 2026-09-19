import { formatCounts, formatPercent, type ProductivitySummary } from '@/lib/productivity';

export interface ProductivityHeadlineProps {
  summary: ProductivitySummary;
  rangeLabel: string;
  /** "Day", "Week" or "Month" — the thing the percentage is measured over. */
  periodNoun: string;
}

/**
 * The single number the whole app is about. A period with nothing due has no
 * percentage at all, so it renders "—" and says why — never a misleading 0%.
 */
export function ProductivityHeadline({
  summary,
  rangeLabel,
  periodNoun,
}: ProductivityHeadlineProps) {
  const empty = summary.percent === null;

  return (
    <div className="min-w-0 space-y-1">
      <p className="text-muted-foreground text-sm">
        {periodNoun} · {rangeLabel}
      </p>
      <p className="text-5xl font-semibold tracking-tight tabular-nums">
        {formatPercent(summary.percent)}
      </p>
      <p className="text-muted-foreground text-sm tabular-nums">
        {formatCounts(summary.done, summary.total)}
      </p>
      {empty ? (
        <p className="text-muted-foreground text-sm">Nothing was due in this period.</p>
      ) : null}
    </div>
  );
}
