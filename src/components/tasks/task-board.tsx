'use client';

import type { IsoDate } from '@/lib/dates';
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

// Implementation lives in this file; this signature is the contract the
// project page builds against.
export function TaskBoard(_props: TaskBoardProps) {
  return null;
}
