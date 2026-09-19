'use client';

import { useCallback, useOptimistic, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { TaskDialog } from '@/components/tasks/task-dialog';
import { TaskEmptyState } from '@/components/tasks/task-empty-state';
import { TaskFilters } from '@/components/tasks/task-filters';
import { TaskList } from '@/components/tasks/task-list';
import { Button } from '@/components/ui/button';
import type { IsoDate } from '@/lib/dates';
import { hasActiveTaskFilters } from '@/lib/task-filters';
import { toggleTaskAction } from '@/server/actions/tasks';
import type { ProjectMemberSummary, TaskFilterState, TaskListItem } from '@/server/types';

export interface TaskBoardProps {
  projectId: string;
  /** Already filtered and sorted by the server. */
  tasks: TaskListItem[];
  members: ProjectMemberSummary[];
  viewerId: string;
  /** Today's calendar date in the viewer's timezone — used to flag overdue. */
  today: IsoDate;
  filters: TaskFilterState;
}

interface ToggleIntent {
  taskId: string;
  done: boolean;
}

/** Flips one task in place, leaving the server's ordering untouched. */
function applyToggle(current: TaskListItem[], intent: ToggleIntent): TaskListItem[] {
  return current.map((task) =>
    task.id === intent.taskId
      ? {
          ...task,
          status: intent.done ? 'DONE' : 'TODO',
          // Left exactly as the server last reported it. This reducer runs
          // during render, so it has to stay pure — no `new Date()` here —
          // and nothing on screen reads the completion timestamp anyway.
          completedAt: intent.done ? task.completedAt : null,
        }
      : task,
  );
}

/**
 * Owns the task list's optimistic state. Checking a box flips the row straight
 * away and only then talks to the server; if the server says no, the optimistic
 * value falls away on its own once the transition settles.
 */
export function TaskBoard({ projectId, tasks, members, viewerId, today, filters }: TaskBoardProps) {
  const [optimisticTasks, toggleOptimistic] = useOptimistic(tasks, applyToggle);
  const [, startTransition] = useTransition();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(() => new Set());

  const handleToggle = useCallback(
    (task: TaskListItem, done: boolean) => {
      setPendingIds((previous) => new Set(previous).add(task.id));

      startTransition(async () => {
        // Inside the transition, so React holds the optimistic value until the
        // action settles and fresh server data arrives.
        toggleOptimistic({ taskId: task.id, done });

        try {
          const result = await toggleTaskAction({ taskId: task.id, done });
          if (result.status === 'error') toast.error(result.message);
        } catch {
          // A dropped connection or an expired session rejects here. Without
          // this the row would sit dimmed for ever with nothing explaining why.
          toast.error('Could not reach the server. Please try again.');
        } finally {
          setPendingIds((previous) => {
            const next = new Set(previous);
            next.delete(task.id);
            return next;
          });
        }
      });
    },
    [toggleOptimistic],
  );

  // The server already sorted by due date then priority, so partitioning by
  // status is all that is left to do.
  const todo = optimisticTasks.filter((task) => task.status === 'TODO');
  const done = optimisticTasks.filter((task) => task.status === 'DONE');

  const filtered = hasActiveTaskFilters(filters);
  const isEmpty = optimisticTasks.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="font-heading text-lg leading-none font-medium">Tasks</h2>
          <p className="text-muted-foreground text-sm tabular-nums">
            {todo.length} to do · {done.length} done
          </p>
        </div>

        <TaskDialog
          mode="create"
          projectId={projectId}
          members={members}
          viewerId={viewerId}
          today={today}
        >
          <Button size="sm">
            <Plus />
            New task
          </Button>
        </TaskDialog>
      </div>

      <TaskFilters projectId={projectId} members={members} filters={filters} viewerId={viewerId} />

      {isEmpty ? (
        <TaskEmptyState projectId={projectId} filtered={filtered}>
          <TaskDialog
            mode="create"
            projectId={projectId}
            members={members}
            viewerId={viewerId}
            today={today}
          >
            <Button size="sm">
              <Plus />
              New task
            </Button>
          </TaskDialog>
        </TaskEmptyState>
      ) : (
        <div className="space-y-6">
          <TaskList
            title="To do"
            tasks={todo}
            members={members}
            projectId={projectId}
            viewerId={viewerId}
            today={today}
            pendingIds={pendingIds}
            onToggle={handleToggle}
            emptyHint={
              filters.status === 'done'
                ? undefined
                : 'Nothing left to do here — every task in this view is done.'
            }
          />
          <TaskList
            title="Done"
            tasks={done}
            members={members}
            projectId={projectId}
            viewerId={viewerId}
            today={today}
            pendingIds={pendingIds}
            onToggle={handleToggle}
            muted
          />
        </div>
      )}
    </div>
  );
}
