import type { Metadata } from 'next';
import { FolderKanban, Plus } from 'lucide-react';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { ProjectCard } from '@/components/projects/project-card';
import { PageHeader } from '@/components/shell/page-header';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { requireUser } from '@/lib/session';
import { listProjectsForUser } from '@/server/queries/projects';

export const metadata: Metadata = { title: 'Projects' };

/**
 * Deliberately has no `loading.tsx` and no in-page `<Suspense>`: any Suspense
 * boundary around this grid stops the create-project server action from ever
 * committing in a production build. See DECISIONS.md §11. The page is a single
 * aggregated query, so it renders fast enough not to need one.
 */
export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listProjectsForUser(user.id, user.timezone);

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Projects" description="Everything you're a member of.">
        <CreateProjectDialog>
          <Button>
            <Plus />
            New project
          </Button>
        </CreateProjectDialog>
      </PageHeader>

      {projects.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderKanban />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project to start tracking work with your team.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateProjectDialog>
              <Button>
                <Plus />
                New project
              </Button>
            </CreateProjectDialog>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
