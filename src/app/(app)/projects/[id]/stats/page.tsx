import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { MemberStatsTable } from '@/components/stats/member-stats-table';
import { resolvePeriod } from '@/components/stats/resolve-period';
import { StatsView } from '@/components/stats/stats-view';
import { Button } from '@/components/ui/button';
import { WEEK_STARTS_ON } from '@/lib/config';
import { buildSeries, summarize } from '@/lib/productivity';
import { getCurrentUser, requireUser } from '@/lib/session';
import { parseStatsQuery } from '@/lib/stats-query';
import type { SearchParamsRecord } from '@/lib/task-filters';
import { getProjectDetail } from '@/server/queries/projects';
import {
  buildMemberStats,
  foldToDayCounts,
  getProjectMemberDayCounts,
} from '@/server/queries/stats';

interface ProjectStatsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsRecord>;
}

/** Memoised for the request so `generateMetadata` and the page share one query. */
const loadProject = cache(async (projectId: string, userId: string) =>
  getProjectDetail(projectId, userId),
);

export async function generateMetadata({ params }: ProjectStatsPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: 'Stats' };

  const project = await loadProject(id, user.id);
  return { title: project ? `${project.name} · Stats` : 'Stats' };
}

export default async function ProjectStatsPage({ params, searchParams }: ProjectStatsPageProps) {
  const user = await requireUser();
  const { id } = await params;

  const project = await loadProject(id, user.id);
  if (!project) notFound();

  const { period, anchor: requestedAnchor } = parseStatsQuery(await searchParams);
  const {
    anchor,
    atCurrent,
    range,
    window: chartWindow,
    rangeLabel,
  } = resolvePeriod(period, requestedAnchor, user.timezone);

  // One aggregated query feeds both the project-wide chart and the member table.
  const rows = await getProjectMemberDayCounts(project.id, user.id, chartWindow);
  const days = foldToDayCounts(rows);
  const memberStats = buildMemberStats(rows, range, project.members);
  const summary = summarize(days, range);
  const series = buildSeries(period, days, anchor, WEEK_STARTS_ON);

  return (
    <>
      <PageHeader title={project.name} description="Productivity across everyone in this project">
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${project.id}`}>
            <ArrowLeft aria-hidden="true" />
            Back to project
          </Link>
        </Button>
      </PageHeader>

      <StatsView
        basePath={`/projects/${project.id}/stats`}
        period={period}
        anchor={anchor}
        atCurrent={atCurrent}
        summary={summary}
        series={series}
        rangeLabel={rangeLabel}
      >
        <MemberStatsTable stats={memberStats} rangeLabel={rangeLabel} />
      </StatsView>
    </>
  );
}
