'use server';

import { revalidatePath } from 'next/cache';
import { getProjectAccess } from '@/lib/authz';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  addMemberSchema,
  createProjectSchema,
  invalid,
  projectIdSchema,
  removeMemberSchema,
  updateProjectSchema,
  type ActionState,
} from '@/lib/validation';

/** A non-member must not be able to tell a project apart from a missing one. */
const NOT_FOUND: ActionState = { status: 'error', message: 'Project not found.' };
const OWNER_ONLY: ActionState = {
  status: 'error',
  message: 'Only the project owner can do that.',
};

function revalidateProject(projectId: string) {
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/stats`);
  revalidatePath('/dashboard');
}

export async function createProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = createProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  });
  if (!parsed.success) return invalid(parsed.error);

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: 'OWNER' },
      },
    },
    select: { id: true },
  });

  revalidatePath('/projects');
  revalidatePath('/dashboard');

  return {
    status: 'success',
    message: 'Project created.',
    redirectTo: `/projects/${project.id}`,
  };
}

export async function updateProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = updateProjectSchema.safeParse({
    projectId: formData.get('projectId'),
    name: formData.get('name'),
    description: formData.get('description'),
  });
  if (!parsed.success) return invalid(parsed.error);

  const access = await getProjectAccess(parsed.data.projectId, user.id);
  if (!access) return NOT_FOUND;
  if (!access.isOwner) return OWNER_ONLY;

  await prisma.project.update({
    where: { id: parsed.data.projectId },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });

  revalidateProject(parsed.data.projectId);
  return { status: 'success', message: 'Project updated.' };
}

export async function deleteProjectAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = projectIdSchema.safeParse({ projectId: formData.get('projectId') });
  if (!parsed.success) return invalid(parsed.error);

  const access = await getProjectAccess(parsed.data.projectId, user.id);
  if (!access) return NOT_FOUND;
  if (!access.isOwner) return OWNER_ONLY;

  // Members and tasks cascade away with the project.
  await prisma.project.delete({ where: { id: parsed.data.projectId } });

  revalidatePath('/projects');
  revalidatePath('/dashboard');

  return { status: 'success', message: 'Project deleted.', redirectTo: '/projects' };
}

export async function addMemberAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = addMemberSchema.safeParse({
    projectId: formData.get('projectId'),
    username: formData.get('username'),
  });
  if (!parsed.success) return invalid(parsed.error, 'Enter a valid username.');

  const { projectId, username } = parsed.data;

  const access = await getProjectAccess(projectId, user.id);
  if (!access) return NOT_FOUND;
  if (!access.isOwner) {
    return {
      status: 'error',
      message: 'Only the project owner can add people.',
      fieldErrors: { username: 'Only the project owner can add people.' },
    };
  }

  const invitee = await prisma.user.findUnique({
    where: { username },
    select: { id: true, displayName: true },
  });

  if (!invitee) {
    return {
      status: 'error',
      message: `No user found with the username "${username}".`,
      fieldErrors: { username: `No user found with the username "${username}".` },
    };
  }

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: invitee.id } },
    select: { id: true },
  });

  if (existing) {
    return {
      status: 'error',
      message: `${invitee.displayName} is already a member of this project.`,
      fieldErrors: { username: 'They are already a member of this project.' },
    };
  }

  await prisma.projectMember.create({
    data: { projectId, userId: invitee.id, role: 'MEMBER' },
  });

  revalidateProject(projectId);
  return { status: 'success', message: `${invitee.displayName} was added to the project.` };
}

export async function removeMemberAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = removeMemberSchema.safeParse({
    projectId: formData.get('projectId'),
    userId: formData.get('userId'),
  });
  if (!parsed.success) return invalid(parsed.error);

  const { projectId, userId } = parsed.data;

  const access = await getProjectAccess(projectId, user.id);
  if (!access) return NOT_FOUND;
  if (!access.isOwner) return OWNER_ONLY;

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true, user: { select: { displayName: true } } },
  });

  if (!membership) return { status: 'error', message: 'That person is not a member.' };
  if (membership.role === 'OWNER') {
    return { status: 'error', message: 'The project owner cannot be removed.' };
  }

  // Their tasks stay behind; they simply become unassigned.
  await prisma.$transaction([
    prisma.task.updateMany({
      where: { projectId, assigneeId: userId },
      data: { assigneeId: null },
    }),
    prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } }),
  ]);

  revalidateProject(projectId);
  return {
    status: 'success',
    message: `${membership.user.displayName} was removed. Their tasks are now unassigned.`,
  };
}
