import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCounts, formatPercent } from '@/lib/productivity';
import type { ProjectListItem } from '@/server/types';

function Stat({
  value,
  caption,
  srLabel,
}: {
  value: string;
  caption: string;
  /** Context a sighted reader gets from the column's position but a screen reader does not. */
  srLabel?: string;
}) {
  return (
    <div className="min-w-0">
      {srLabel ? <span className="sr-only">{srLabel}: </span> : null}
      <p className="truncate text-sm font-medium tabular-nums">{value}</p>
      <p className="text-muted-foreground truncate text-xs">{caption}</p>
    </div>
  );
}

/** One project in the projects grid. The whole card is a link to the project. */
export function ProjectCard({ project }: { project: ProjectListItem }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="focus-visible:ring-ring/50 block h-full rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="hover:bg-accent/40 h-full transition-colors">
        <CardHeader>
          <CardTitle className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold">{project.name}</span>
            {project.role === 'OWNER' ? <Badge variant="secondary">OWNER</Badge> : null}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col justify-between gap-4">
          {project.description ? (
            <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
              {project.description}
            </p>
          ) : (
            <p className="text-muted-foreground/70 text-sm italic">No description</p>
          )}

          <div className="grid grid-cols-3 gap-3 border-t pt-3">
            <Stat value={`${project.openTaskCount} open`} caption="Tasks" />
            <Stat value={`${project.memberCount} members`} caption="Team" />
            <Stat
              value={formatPercent(project.monthPercent)}
              caption={formatCounts(project.monthDone, project.monthTotal)}
              srLabel="Completed this month"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
