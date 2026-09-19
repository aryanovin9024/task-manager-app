import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChartColumn } from 'lucide-react';
import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog';
import { EditProjectDialog } from '@/components/projects/edit-project-dialog';
import { MembersPanel } from '@/components/projects/members-panel';
import { PageHeader } from '@/components/shell/page-header';
import { TaskBoard } from '@/components/tasks/task-board';
import { Button } from '@/components/ui/button';
import { todayInTimeZone } from '@/lib/dates';
import { getCurrentUser, requireUser } from '@/lib/session';
import { parseTaskFilters, type SearchParamsRecord } from '@/lib/task-filters';
import { getProjectDetail } from '@/server/queries/projects';
import { listProjectTasks } from '@/server/queries/tasks';

interface ProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParamsRecord>;
}

/** Memoised for the request so `generateMetadata` and the page share one query. */
const loadProject = cache(async (projectId: string, userId: string) =>
  getProjectDetail(projectId, userId),
);

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return { title: 'Project' };

  const project = await loadProject(id, user.id);
  return { title: project?.name ?? 'Project' };
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const { id } = await params;

  const user = await requireUser();
  const project = await loadProject(id, user.id);
  if (!project) notFound();

  const filters = parseTaskFilters(await searchParams);
  const today = todayInTimeZone(new Date(), user.timezone);
  const tasks = await listProjectTasks(project.id, user.id, filters, today);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={project.name} description={project.description ?? undefined}>
        <Button asChild variant="outline" size="sm">
          <Link href={`/projects/${project.id}/stats`}>
            <ChartColumn />
            Stats
          </Link>
        </Button>
        {project.isOwner ? (
          <>
            <EditProjectDialog project={project} />
            <DeleteProjectDialog project={project} />
          </>
        ) : null}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <TaskBoard
            projectId={project.id}
            tasks={tasks}
            members={project.members}
            viewerId={user.id}
            today={today}
            filters={filters}
          />
        </div>

        <div className="min-w-0">
          <MembersPanel project={project} viewerId={user.id} />
        </div>
      </div>
    </div>
  );
}
