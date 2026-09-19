import { WEEK_STARTS_ON } from '@/lib/config';
import { parseIsoDate } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { currentDate, periodRange, toPercent } from '@/lib/productivity';
import type { ProjectDetail, ProjectListItem } from '../types';

/**
 * Every project the user belongs to, with its open task count and this
 * calendar month's productivity.
 *
 * Three queries total, regardless of how many projects there are: the
 * memberships, then two grouped aggregates across all of them at once.
 */
export async function listProjectsForUser(
  userId: string,
  timezone: string,
  now: Date = new Date(),
): Promise<ProjectListItem[]> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    orderBy: [{ project: { createdAt: 'desc' } }],
    select: {
      role: true,
      project: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (memberships.length === 0) return [];

  const projectIds = memberships.map((membership) => membership.project.id);
  const month = periodRange('monthly', currentDate(now, timezone), WEEK_STARTS_ON);

  const [openRows, monthRows] = await Promise.all([
    prisma.task.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds }, status: 'TODO' },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: {
        projectId: { in: projectIds },
        dueDate: { gte: parseIsoDate(month.start), lte: parseIsoDate(month.end) },
      },
      _count: { _all: true },
    }),
  ]);

  const openByProject = new Map<string, number>();
  for (const row of openRows) {
    openByProject.set(row.projectId, row._count._all);
  }

  const monthByProject = new Map<string, { done: number; total: number }>();
  for (const row of monthRows) {
    const bucket = monthByProject.get(row.projectId) ?? { done: 0, total: 0 };
    bucket.total += row._count._all;
    if (row.status === 'DONE') bucket.done += row._count._all;
    monthByProject.set(row.projectId, bucket);
  }

  return memberships.map(({ role, project }) => {
    const month = monthByProject.get(project.id) ?? { done: 0, total: 0 };
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      role,
      memberCount: project._count.members,
      openTaskCount: openByProject.get(project.id) ?? 0,
      monthDone: month.done,
      monthTotal: month.total,
      monthPercent: toPercent(month.done, month.total),
    };
  });
}

/**
 * A project with its members, or `null` when the caller is not a member —
 * the membership check is part of the query, so a non-member cannot even
 * learn that the id exists.
 */
export async function getProjectDetail(
  projectId: string,
  userId: string,
): Promise<ProjectDetail | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, members: { some: { userId } } },
    select: {
      id: true,
      name: true,
      description: true,
      ownerId: true,
      createdAt: true,
      members: {
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        select: {
          role: true,
          joinedAt: true,
          user: { select: { id: true, username: true, displayName: true } },
        },
      },
    },
  });

  if (!project) return null;

  const members = project.members.map((member) => ({
    id: member.user.id,
    username: member.user.username,
    displayName: member.user.displayName,
    role: member.role,
    joinedAt: member.joinedAt,
  }));

  const viewer = members.find((member) => member.id === userId);
  if (!viewer) return null;

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    ownerId: project.ownerId,
    createdAt: project.createdAt,
    role: viewer.role,
    isOwner: viewer.role === 'OWNER',
    members,
  };
}
