/**
 * Shared data-transfer types.
 *
 * Every query in `src/server/queries` returns one of these and every component
 * consumes one of these — Prisma models never leak into the UI layer.
 */
import type { Priority, Role, TaskStatus } from '@prisma/client';
import type { IsoDate } from '@/lib/dates';

export type { Priority, Role, TaskStatus };

export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
}

export interface ProjectMemberSummary extends UserSummary {
  role: Role;
  joinedAt: Date;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  role: Role;
  memberCount: number;
  /** Tasks still in TODO, regardless of due date. */
  openTaskCount: number;
  /** Productivity for the current calendar month in the viewer's timezone. */
  monthDone: number;
  monthTotal: number;
  monthPercent: number | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  role: Role;
  isOwner: boolean;
  members: ProjectMemberSummary[];
}

export interface TaskListItem {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  priority: Priority;
  /** Calendar date, `YYYY-MM-DD`. */
  dueDate: IsoDate;
  status: TaskStatus;
  completedAt: Date | null;
  assignee: UserSummary | null;
  creator: UserSummary;
}

export type TaskStatusFilter = 'all' | 'todo' | 'done';

export interface TaskFilterState {
  /** A user id, `'unassigned'`, or `'all'`. */
  assignee: string;
  status: TaskStatusFilter;
  overdue: boolean;
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  assignee: 'all',
  status: 'all',
  overdue: false,
};

/** One row of the single grouped stats query: counts per member per due date. */
export interface MemberDayCount {
  userId: string | null;
  date: IsoDate;
  total: number;
  done: number;
}

/** A row of the per-member table on the project stats page. */
export interface MemberPeriodStat {
  user: UserSummary | null;
  done: number;
  total: number;
  percent: number | null;
}
