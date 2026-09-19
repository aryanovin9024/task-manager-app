'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { formatCounts, formatPercent, type PeriodKind, type SeriesPoint } from '@/lib/productivity';

const BUCKET_NOUNS: Record<PeriodKind, string> = {
  daily: 'days',
  weekly: 'weeks',
  monthly: 'months',
};

/** One bar. `percent` is chart-safe (0 for empty buckets); `hasData` tells them apart. */
interface ChartDatum {
  key: string;
  label: string;
  fullLabel: string;
  percent: number;
  hasData: boolean;
  done: number;
  total: number;
}

export interface ProductivityChartProps {
  series: SeriesPoint[];
  periodKind: PeriodKind;
}

export function ProductivityChart({ series, periodKind }: ProductivityChartProps) {
  const data: ChartDatum[] = series.map((point) => ({
    key: point.key,
    label: point.label,
    fullLabel: point.fullLabel,
    percent: point.percent ?? 0,
    hasData: point.total > 0,
    done: point.done,
    total: point.total,
  }));

  if (data.length === 0) {
    return (
      <p className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
        Nothing to chart yet.
      </p>
    );
  }

  const first = data[0];
  const last = data[data.length - 1];
  const measured = data.filter((datum) => datum.hasData);

  return (
    <figure className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={periodKind === 'daily' ? 4 : 'preserveStartEnd'}
            tickMargin={8}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(value: number) => `${value}%`}
            width={40}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          <Tooltip
            content={ProductivityTooltip}
            cursor={{ fill: 'var(--muted-foreground)', fillOpacity: 0.12 }}
          />
          <Bar dataKey="percent" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((datum) => (
              <Cell key={datum.key} fill={datum.hasData ? 'var(--chart-1)' : 'var(--muted)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <figcaption className="sr-only">
        {`Bar chart of productivity for ${data.length} ${BUCKET_NOUNS[periodKind]}, from ${first.fullLabel} to ${last.fullLabel}. ` +
          (measured.length === 0
            ? 'Nothing was due in any of them.'
            : `${measured
                .map(
                  (datum) =>
                    `${datum.fullLabel}: ${formatPercent(datum.percent)}, ${formatCounts(
                      datum.done,
                      datum.total,
                    )}`,
                )
                .join('. ')}. The remaining ${BUCKET_NOUNS[periodKind]} had nothing due.`)}
      </figcaption>
    </figure>
  );
}

/**
 * Reads the hovered row back out of Recharts' loosely-typed payload without
 * trusting its shape.
 */
function toChartDatum(value: unknown): ChartDatum | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  if (
    typeof record.fullLabel !== 'string' ||
    typeof record.percent !== 'number' ||
    typeof record.done !== 'number' ||
    typeof record.total !== 'number'
  ) {
    return null;
  }
  return {
    key: typeof record.key === 'string' ? record.key : record.fullLabel,
    label: typeof record.label === 'string' ? record.label : record.fullLabel,
    fullLabel: record.fullLabel,
    percent: record.percent,
    hasData: record.hasData === true,
    done: record.done,
    total: record.total,
  };
}

function ProductivityTooltip({ active, payload }: TooltipContentProps) {
  if (!active || payload.length === 0) return null;
  const datum = toChartDatum(payload[0]?.payload);
  if (!datum) return null;

  // An empty bucket has no percentage — show "—", not the 0 the bar is drawn at.
  const percent = datum.hasData ? datum.percent : null;

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{datum.fullLabel}</p>
      <p className="mt-0.5 tabular-nums">
        <span className="font-semibold">{formatPercent(percent)}</span>
        <span className="text-muted-foreground"> · {formatCounts(datum.done, datum.total)}</span>
      </p>
    </div>
  );
}
