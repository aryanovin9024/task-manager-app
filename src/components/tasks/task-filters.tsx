'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { hasActiveTaskFilters, taskFiltersToQuery } from '@/lib/task-filters';
import { cn } from '@/lib/utils';
import { UNASSIGNED } from '@/lib/validation';
import {
  DEFAULT_TASK_FILTERS,
  type ProjectMemberSummary,
  type TaskFilterState,
  type TaskStatusFilter,
} from '@/server/types';

const STATUS_OPTIONS: ReadonlyArray<{ value: TaskStatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To do' },
  { value: 'done', label: 'Done' },
];

function isStatusFilter(value: string): value is TaskStatusFilter {
  return value === 'all' || value === 'todo' || value === 'done';
}

interface TaskFiltersProps {
  projectId: string;
  members: ProjectMemberSummary[];
  filters: TaskFilterState;
  viewerId: string;
}

/**
 * The filters live in the URL, so the server can do the filtering and the view
 * stays shareable and refresh-proof.
 */
export function TaskFilters({ projectId, members, filters, viewerId }: TaskFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isActive = hasActiveTaskFilters(filters);

  function apply(next: TaskFilterState) {
    startTransition(() => {
      router.push(`/projects/${projectId}${taskFiltersToQuery(next)}`, { scroll: false });
    });
  }

  return (
    <div
      aria-busy={isPending}
      className={cn(
        'flex flex-wrap items-center gap-2 transition-opacity',
        isPending && 'opacity-60',
      )}
    >
      <Select
        value={filters.assignee}
        onValueChange={(assignee) => apply({ ...filters, assignee })}
      >
        <SelectTrigger size="sm" aria-label="Filter by assignee" className="max-w-[11rem] min-w-0">
          <SelectValue placeholder="Anyone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Anyone</SelectItem>
          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.displayName}
              {member.id === viewerId ? ' (You)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(status) => {
          if (isStatusFilter(status)) apply({ ...filters, status });
        }}
      >
        <SelectTrigger size="sm" aria-label="Filter by status" className="min-w-0">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        size="sm"
        variant={filters.overdue ? 'default' : 'outline'}
        aria-pressed={filters.overdue}
        onClick={() => apply({ ...filters, overdue: !filters.overdue })}
      >
        <TriangleAlert />
        Overdue only
      </Button>

      {isActive ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => apply(DEFAULT_TASK_FILTERS)}
        >
          <X />
          Clear
        </Button>
      ) : null}
    </div>
  );
}
