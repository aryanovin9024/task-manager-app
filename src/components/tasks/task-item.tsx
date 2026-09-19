'use client';

import { useId } from 'react';
import { CalendarDays, Pencil } from 'lucide-react';
import { DeleteTaskDialog } from '@/components/tasks/delete-task-dialog';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatIsoDate, type IsoDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { ProjectMemberSummary, TaskListItem } from '@/server/types';

/** Up to two initials, so the avatar stays readable at 24px. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.slice(0, 2).map((part) => part[0] ?? '');
  return letters.join('').toUpperCase();
}

interface TaskItemProps {
  task: TaskListItem;
  members: ProjectMemberSummary[];
  projectId: string;
  /** Today in the viewer's timezone. */
  today: IsoDate;
  /** True while this row's check/uncheck is still in flight. */
  isPending: boolean;
  onToggle: (done: boolean) => void;
  /** The viewer, so the edit dialog can default the assignee sensibly. */
  viewerId: string;
}

export function TaskItem({
  task,
  members,
  projectId,
  today,
  isPending,
  onToggle,
  viewerId,
}: TaskItemProps) {
  const checkboxId = useId();
  const isDone = task.status === 'DONE';
  // A finished task is never late, however long ago it was due.
  const isOverdue = task.status === 'TODO' && task.dueDate < today;

  return (
    <li
      className={cn(
        'hover:bg-accent/40 flex items-start gap-3 rounded-lg border p-3 transition-colors',
        isPending && 'opacity-70',
      )}
    >
      <Checkbox
        id={checkboxId}
        checked={isDone}
        onCheckedChange={(checked) => onToggle(checked === true)}
        className="mt-1"
        aria-label={isDone ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <label
          htmlFor={checkboxId}
          className={cn(
            'block text-sm leading-snug font-medium break-words',
            isDone && 'text-muted-foreground line-through',
          )}
        >
          {task.title}
        </label>

        {task.description ? (
          <p className="text-muted-foreground line-clamp-1 text-sm break-words">
            {task.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          <PriorityBadge priority={task.priority} />

          <span
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap',
              isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
            )}
          >
            <CalendarDays className="size-3.5" aria-hidden="true" />
            <span className="sr-only">Due </span>
            {formatIsoDate(task.dueDate)}
          </span>

          {isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}

          {task.assignee ? (
            <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1.5">
              <Avatar size="sm">
                <AvatarFallback>{initialsOf(task.assignee.displayName)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{task.assignee.displayName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground italic">Unassigned</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <TaskDialog
          mode="edit"
          projectId={projectId}
          members={members}
          viewerId={viewerId}
          today={today}
          task={task}
        >
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Pencil />
            <span className="sr-only">Edit task “{task.title}”</span>
          </Button>
        </TaskDialog>
        <DeleteTaskDialog taskId={task.id} title={task.title} />
      </div>
    </li>
  );
}
