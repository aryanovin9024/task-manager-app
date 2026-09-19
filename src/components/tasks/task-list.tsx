'use client';

import { TaskItem } from '@/components/tasks/task-item';
import type { IsoDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { ProjectMemberSummary, TaskListItem } from '@/server/types';

interface TaskListProps {
  title: string;
  /** Already in server order — this component never re-sorts. */
  tasks: TaskListItem[];
  members: ProjectMemberSummary[];
  projectId: string;
  viewerId: string;
  today: IsoDate;
  /** Ids whose check/uncheck has not come back from the server yet. */
  pendingIds: ReadonlySet<string>;
  onToggle: (task: TaskListItem, done: boolean) => void;
  /** Slightly dimmed — used for the "Done" section. */
  muted?: boolean;
  /** Shown instead of the list when this section is empty. Omit to hide the section. */
  emptyHint?: string;
}

/** One titled, counted section of the task list. */
export function TaskList({
  title,
  tasks,
  members,
  projectId,
  viewerId,
  today,
  pendingIds,
  onToggle,
  muted = false,
  emptyHint,
}: TaskListProps) {
  if (tasks.length === 0 && !emptyHint) return null;

  return (
    <section className="space-y-2">
      <h3 className="flex items-baseline gap-2">
        <span className={cn('text-sm font-medium', muted && 'text-muted-foreground')}>{title}</span>
        <span className="text-muted-foreground text-xs tabular-nums">{tasks.length}</span>
      </h3>

      {tasks.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
          {emptyHint}
        </p>
      ) : (
        <ul className={cn('space-y-2', muted && 'opacity-80')}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              members={members}
              projectId={projectId}
              viewerId={viewerId}
              today={today}
              isPending={pendingIds.has(task.id)}
              onToggle={(done) => onToggle(task, done)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
