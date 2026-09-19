'use server';

import { revalidatePath } from 'next/cache';
import { getProjectAccess } from '@/lib/authz';
import { parseIsoDate } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  createTaskSchema,
  invalid,
  taskIdSchema,
  toggleTaskSchema,
  UNASSIGNED,
  updateTaskSchema,
  type ActionState,
} from '@/lib/validation';

const NOT_FOUND: ActionState = { status: 'error', message: 'Task not found.' };
const PROJECT_NOT_FOUND: ActionState = { status: 'error', message: 'Project not found.' };

function revalidateTaskViews(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stats`);
  revalidatePath('/projects');
  revalidatePath('/dashboard');
}

/**
 * Resolves the submitted assignee:
 *  - field omitted  → the creator (the brief's default)
 *  - `'unassigned'` → nobody
 *  - a user id      → that person, but only if they are a member of the project
 */
async function resolveAssignee(
  projectId: string,
  submitted: string | undefined,
  fallbackUserId: string,
): Promise<{ ok: true; assigneeId: string | null } | { ok: false; state: ActionState }> {
  if (submitted === undefined) return { ok: true, assigneeId: fallbackUserId };
  if (submitted === UNASSIGNED) return { ok: true, assigneeId: null };

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: submitted } },
    select: { id: true },
  });

  if (!membership) {
    return {
      ok: false,
      state: {
        status: 'error',
        message: 'That person is not a member of this project.',
        fieldErrors: { assigneeId: 'Pick someone who is a member of this project.' },
      },
    };
  }

  return { ok: true, assigneeId: submitted };
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = createTaskSchema.safeParse({
    projectId: formData.get('projectId'),
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority') ?? undefined,
    dueDate: formData.get('dueDate'),
    assigneeId: formData.get('assigneeId'),
  });
  if (!parsed.success) return invalid(parsed.error);

  const { projectId, title, description, priority, dueDate, assigneeId } = parsed.data;

  const access = await getProjectAccess(projectId, user.id);
  if (!access) return PROJECT_NOT_FOUND;

  const assignee = await resolveAssignee(projectId, assigneeId, user.id);
  if (!assignee.ok) return assignee.state;

  await prisma.task.create({
    data: {
      projectId,
      creatorId: user.id,
      assigneeId: assignee.assigneeId,
      title,
      description: description || null,
      priority,
      dueDate: parseIsoDate(dueDate),
    },
  });

  revalidateTaskViews(projectId);
  return { status: 'success', message: 'Task created.' };
}

export async function updateTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = updateTaskSchema.safeParse({
    taskId: formData.get('taskId'),
    projectId: formData.get('projectId'),
    title: formData.get('title'),
    description: formData.get('description'),
    priority: formData.get('priority') ?? undefined,
    dueDate: formData.get('dueDate'),
    assigneeId: formData.get('assigneeId'),
  });
  if (!parsed.success) return invalid(parsed.error);

  const { taskId, title, description, priority, dueDate, assigneeId } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return NOT_FOUND;

  const access = await getProjectAccess(task.projectId, user.id);
  if (!access) return NOT_FOUND;

  const assignee = await resolveAssignee(task.projectId, assigneeId, user.id);
  if (!assignee.ok) return assignee.state;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: description || null,
      priority,
      dueDate: parseIsoDate(dueDate),
      assigneeId: assignee.assigneeId,
    },
  });

  revalidateTaskViews(task.projectId);
  return { status: 'success', message: 'Task updated.' };
}

export async function deleteTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = taskIdSchema.safeParse({ taskId: formData.get('taskId') });
  if (!parsed.success) return invalid(parsed.error);

  const task = await prisma.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { projectId: true },
  });
  if (!task) return NOT_FOUND;

  const access = await getProjectAccess(task.projectId, user.id);
  if (!access) return NOT_FOUND;

  await prisma.task.delete({ where: { id: parsed.data.taskId } });

  revalidateTaskViews(task.projectId);
  return { status: 'success', message: 'Task deleted.' };
}

/**
 * Check / uncheck. Called directly (not through a form) so the task list can
 * wrap it in an optimistic transition.
 */
export async function toggleTaskAction(input: {
  taskId: string;
  done: boolean;
}): Promise<ActionState> {
  const user = await requireUser();

  const parsed = toggleTaskSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error, 'Could not update that task.');

  const { taskId, done } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  if (!task) return NOT_FOUND;

  const access = await getProjectAccess(task.projectId, user.id);
  if (!access) return NOT_FOUND;

  await prisma.task.update({
    where: { id: taskId },
    data: done
      ? { status: 'DONE', completedAt: new Date() }
      : { status: 'TODO', completedAt: null },
  });

  revalidateTaskViews(task.projectId);
  return { status: 'success' };
}
