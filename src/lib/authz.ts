import { notFound } from 'next/navigation';
import type { Role } from '@prisma/client';
import { prisma } from './prisma';

export interface ProjectAccess {
  projectId: string;
  role: Role;
  isOwner: boolean;
}

/**
 * Returns the caller's membership of a project, or `null` if they are not a
 * member. Every query and every server action that touches a project funnels
 * through here — a non-member must never learn that the project exists.
 */
export async function getProjectAccess(
  projectId: string,
  userId: string,
): Promise<ProjectAccess | null> {
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (!membership) return null;
  return { projectId, role: membership.role, isOwner: membership.role === 'OWNER' };
}

/** Page-level guard: renders the 404 page for non-members. */
export async function requireProjectAccess(
  projectId: string,
  userId: string,
): Promise<ProjectAccess> {
  const access = await getProjectAccess(projectId, userId);
  if (!access) notFound();
  return access;
}

/** Page-level guard for owner-only screens. */
export async function requireProjectOwner(
  projectId: string,
  userId: string,
): Promise<ProjectAccess> {
  const access = await requireProjectAccess(projectId, userId);
  if (!access.isOwner) notFound();
  return access;
}
