import { DEFAULT_TASK_FILTERS, type TaskFilterState, type TaskStatusFilter } from '@/server/types';

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUSES: readonly TaskStatusFilter[] = ['all', 'todo', 'done'];

/** Reads the task list filters out of the URL. Anything unrecognised falls back. */
export function parseTaskFilters(params: SearchParamsRecord): TaskFilterState {
  const status = first(params.status);
  const assignee = first(params.assignee);
  const overdue = first(params.overdue);

  return {
    assignee: assignee && assignee.length <= 64 ? assignee : DEFAULT_TASK_FILTERS.assignee,
    status: STATUSES.includes(status as TaskStatusFilter)
      ? (status as TaskStatusFilter)
      : DEFAULT_TASK_FILTERS.status,
    overdue: overdue === 'true' || overdue === '1',
  };
}

/** Serialises filters back into a query string, omitting defaults. */
export function taskFiltersToQuery(filters: TaskFilterState): string {
  const params = new URLSearchParams();
  if (filters.assignee !== 'all') params.set('assignee', filters.assignee);
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.overdue) params.set('overdue', 'true');
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function hasActiveTaskFilters(filters: TaskFilterState): boolean {
  return filters.assignee !== 'all' || filters.status !== 'all' || filters.overdue;
}
