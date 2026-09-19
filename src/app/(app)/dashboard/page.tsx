import type { Metadata } from 'next';
import { PageHeader } from '@/components/shell/page-header';
import { resolvePeriod } from '@/components/stats/resolve-period';
import { StatsView } from '@/components/stats/stats-view';
import { WEEK_STARTS_ON } from '@/lib/config';
import { buildSeries, summarize } from '@/lib/productivity';
import { requireUser } from '@/lib/session';
import { parseStatsQuery } from '@/lib/stats-query';
import type { SearchParamsRecord } from '@/lib/task-filters';
import { getPersonalDayCounts } from '@/server/queries/stats';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsRecord>;
}) {
  const user = await requireUser();
  const { period, anchor: requestedAnchor } = parseStatsQuery(await searchParams);
  const {
    anchor,
    atCurrent,
    range,
    window: chartWindow,
    rangeLabel,
  } = resolvePeriod(period, requestedAnchor, user.timezone);

  // One aggregated query covers the whole chart window.
  const days = await getPersonalDayCounts(user.id, chartWindow);
  const summary = summarize(days, range);
  const series = buildSeries(period, days, anchor, WEEK_STARTS_ON);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your productivity across every project — tasks assigned to you."
      />
      <StatsView
        basePath="/dashboard"
        period={period}
        anchor={anchor}
        atCurrent={atCurrent}
        summary={summary}
        series={series}
        rangeLabel={rangeLabel}
      />
    </>
  );
}
