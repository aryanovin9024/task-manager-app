import type { Prisma } from '@prisma/client';
import { parseIsoDate, toIsoDate, type IsoDate } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import type { TaskFilterState, TaskListItem } from '../types';

const TASK_SELECT = {
  id: true,
  projectId: true,
  title: true,
  description: true,
  priority: true,
  dueDate: true,
  status: true,
  completedAt: true,
  assignee: { select: { id: true, username: true, displayName: true } },
  creator: { select: { id: true, username: true, displayName: true } },
} satisfies Prisma.TaskSelect;

type TaskRow = Prisma.TaskGetPayload<{ select: typeof TASK_SELECT }>;

function toListItem(task: TaskRow): TaskListItem {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: toIsoDate(task.dueDate),
    status: task.status,
    completedAt: task.completedAt,
    assignee: task.assignee,
    creator: task.creator,
  };
}

/**
 * Tasks in a project, filtered and sorted by due date then priority
 * (highest first). The membership check is baked into the `where` clause as
 * well as being enforced by the page guard.
 */
export async function listProjectTasks(
  projectId: string,
  userId: string,
  filters: TaskFilterState,
  today: IsoDate,
): Promise<TaskListItem[]> {
  const where: Prisma.TaskWhereInput = {
    projectId,
    project: { members: { some: { userId } } },
  };

  if (filters.assignee === 'unassigned') {
    where.assigneeId = null;
  } else if (filters.assignee !== 'all') {
    where.assigneeId = filters.assignee;
  }

  if (filters.overdue) {
    // Overdue is by definition still to do, so it wins over the status filter.
    where.status = 'TODO';
    where.dueDate = { lt: parseIsoDate(today) };
  } else if (filters.status === 'todo') {
    where.status = 'TODO';
  } else if (filters.status === 'done') {
    where.status = 'DONE';
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    select: TASK_SELECT,
  });

  return tasks.map(toListItem);
}
