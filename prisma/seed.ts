/**
 * Development seed.
 *
 * Creates three users, two shared projects and 60 tasks whose due dates are
 * spread over the last 90 days plus the coming week, with a completion pattern
 * chosen so the productivity charts have something interesting to draw.
 *
 * Two properties matter here:
 *
 * 1. **Deterministic.** No `Math.random()` — a fixed-seed mulberry32 PRNG picks
 *    which days inside a week are used, which tasks are finished, every priority
 *    and every timestamp. Due dates are relative to the day you run it, but the
 *    shape never moves: on any machine, on any date, you get 60 tasks, 41 of
 *    them done (68.3%), 13 overdue and 3 unassigned.
 * 2. **Re-runnable.** It deletes the two seeded projects by name *and* by
 *    seeded owner (which cascades to their tasks and memberships) and upserts
 *    the three users by email. A project you created yourself is never touched,
 *    even if you happened to give it the same name, and there is no `deleteMany`
 *    over the whole schema here.
 *
 * Run with `npm run db:seed`.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Priority, type TaskStatus } from '@prisma/client';
import {
  addDays,
  endOfMonth,
  parseIsoDate,
  startOfMonth,
  toIsoDate,
  type IsoDate,
} from '../src/lib/dates';
import { formatPercent, toPercent } from '../src/lib/productivity';
import { hashPassword } from '../src/lib/password';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env before seeding.');
}

// Prisma 7 reaches Postgres through a driver adapter rather than a query engine
// binary, so the seed builds its own client the same way src/lib/prisma.ts does.
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/* -------------------------------------------------------------------------- */
/* Deterministic randomness                                                   */
/* -------------------------------------------------------------------------- */

/** mulberry32 — small, fast, and identical on every machine. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20260919);

/** Inclusive on both ends. */
function randomInt(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function shuffled<T>(values: readonly T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const held = copy[index];
    copy[index] = copy[swap];
    copy[swap] = held;
  }
  return copy;
}

/** Roughly a fifth high, half medium, the rest low. */
function randomPriority(): Priority {
  const roll = random();
  if (roll < 0.22) return 'HIGH';
  if (roll < 0.76) return 'MEDIUM';
  return 'LOW';
}

/* -------------------------------------------------------------------------- */
/* People                                                                     */
/* -------------------------------------------------------------------------- */

const SEED_PASSWORD = 'password123';

interface UserSeed {
  email: string;
  username: string;
  displayName: string;
  timezone: string;
}

const USERS: readonly UserSeed[] = [
  {
    email: 'ada@example.com',
    username: 'ada',
    displayName: 'Ada Lovelace',
    timezone: 'Europe/London',
  },
  {
    email: 'grace@example.com',
    username: 'grace',
    displayName: 'Grace Hopper',
    timezone: 'America/New_York',
  },
  {
    email: 'alan@example.com',
    username: 'alan',
    displayName: 'Alan Turing',
    timezone: 'Europe/London',
  },
];

/* -------------------------------------------------------------------------- */
/* Work                                                                       */
/* -------------------------------------------------------------------------- */

/** `[title, description?]` — 30 per project, all distinct. */
type TaskSeed = readonly [title: string, description?: string];

const WEBSITE_REDESIGN_NAME = 'Website Redesign';
const PLATFORM_MIGRATION_NAME = 'Q4 Platform Migration';

const WEBSITE_TASKS: readonly TaskSeed[] = [
  ['Audit the current site for accessibility issues', 'Keyboard traps, contrast and alt text.'],
  ['Define the new type scale and spacing rhythm'],
  ['Rebuild the homepage hero section', 'New headline, single call to action, no carousel.'],
  ['Consolidate the colour palette into design tokens'],
  ['Migrate the blog index to the new layout'],
  ['Write copy for the new pricing page', 'Three tiers, annual toggle, no fake scarcity.'],
  ['Compress and re-encode all marketing imagery'],
  ['Replace the legacy icon set with Lucide'],
  ['Set up visual regression snapshots for key pages'],
  ['Fix layout shift on the customer logos strip', 'Reserve the box before the images load.'],
  ['Rework the mobile navigation drawer'],
  ['Add a skip-to-content link and visible focus outlines'],
  ['Redesign the contact form and its error states'],
  ['Move the changelog off the old CMS'],
  ['Standardise button sizes across the site'],
  ['Draft the 404 and 500 page illustrations'],
  ['Audit and prune unused CSS', 'The stylesheet is 180 kB and most of it is dead.'],
  ['Add Open Graph images for every landing page'],
  ['Rewrite the careers page for the new roles'],
  ['Set up dark mode tokens and check both themes'],
  ['Replace the hero video with a lighter WebM'],
  ['Update the footer sitemap links'],
  ['Review the redesign with the sales team', 'Walk through the pricing and demo pages.'],
  ['Fix broken anchor links after the URL changes'],
  ['Add redirects for the retired product pages'],
  ['Tune Lighthouse performance on the pricing page'],
  ['Localise date formats in the blog'],
  ['Ship the new testimonial carousel'],
  ['QA the redesign on iOS Safari and Firefox', 'Both themes, 375px and 1440px wide.'],
  ['Write the launch announcement post'],
];

const MIGRATION_TASKS: readonly TaskSeed[] = [
  ['Inventory every service still on the legacy cluster'],
  ['Write the migration runbook', 'One page per service, with the rollback step first.'],
  ['Provision the staging VPC'],
  ['Benchmark Postgres 16 against the current 13'],
  ['Move the job queue onto the new broker'],
  ['Add structured logging to the billing service'],
  ['Cut over the internal DNS records', 'Drop the TTL to 60s a day beforehand.'],
  ['Replace hard-coded secrets with vault references'],
  ['Load test the new API gateway', 'Target 2x peak traffic for thirty minutes.'],
  ['Backfill the analytics events table'],
  ['Retire the deprecated v1 endpoints'],
  ['Set up blue/green deploys for the API'],
  ['Write rollback steps for each cutover window'],
  ['Migrate the file store to object storage'],
  ['Reconcile row counts after the first dry run', 'Any drift blocks the real cutover.'],
  ['Add read replicas for the reporting queries'],
  ['Update the on-call runbook for the new stack'],
  ['Rotate the database credentials post-migration'],
  ['Instrument p99 latency dashboards'],
  ['Decommission the old staging environment'],
  ['Move cron jobs onto the scheduler service'],
  ['Patch the connection pool exhaustion bug', 'Pool of 10 against 40 workers — it saturates.'],
  ['Document the new environment variables'],
  ['Migrate CI runners to the new base image'],
  ['Verify backups restore onto the new cluster', 'A backup nobody has restored is not a backup.'],
  ['Trim the container image down from 1.2 GB'],
  ['Align retry policies across the services'],
  ['Schedule the production cutover window'],
  ['Write the post-migration smoke test checklist'],
  ['Draft the incident postmortem template'],
];

/* -------------------------------------------------------------------------- */
/* The shape of the chart                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One entry per week, oldest first. Week 0 starts 90 days ago; week 12 is the
 * seven days ending today. `done` is fixed rather than sampled so the bars keep
 * the same silhouette on every run: older weeks mostly finished (~84% across
 * weeks 0-8), a visible slide over the last month, and four tasks last week of
 * which three are still open and therefore overdue.
 */
interface WeekPlan {
  count: number;
  done: number;
}

const PAST_WEEKS: readonly WeekPlan[] = [
  { count: 4, done: 3 }, // 75.0%
  { count: 5, done: 4 }, // 80.0%
  { count: 3, done: 3 }, // 100.0%
  { count: 5, done: 4 }, // 80.0%
  { count: 4, done: 4 }, // 100.0%
  { count: 6, done: 5 }, // 83.3%
  { count: 4, done: 3 }, // 75.0%
  { count: 4, done: 4 }, // 100.0%
  { count: 3, done: 2 }, // 66.7%
  { count: 4, done: 3 }, // 75.0%
  { count: 4, done: 3 }, // 75.0%
  { count: 4, done: 2 }, // 50.0%
  { count: 4, done: 1 }, // 25.0%
];

/**
 * Tasks due today or in the coming week, all still TODO. One of them is always
 * due today, so the daily view has something in it the moment you log in.
 */
const UPCOMING_COUNT = 6;

/** Day offsets relative to today for the oldest week. */
const WINDOW_START_OFFSET = -90;

/**
 * Positions in the generated list that get no assignee, so the "Unassigned"
 * row on the project stats page has something in it. One is old, one is about a
 * month back and one landed last week.
 */
const UNASSIGNED_SLOTS = new Set([10, 39, 52]);

interface PlannedTask {
  dueDate: IsoDate;
  status: TaskStatus;
}

/** Lays out every due date and status before anything touches the database. */
function planTasks(today: IsoDate): PlannedTask[] {
  const planned: PlannedTask[] = [];

  PAST_WEEKS.forEach((week, weekIndex) => {
    const weekStartOffset = WINDOW_START_OFFSET + weekIndex * 7;
    // Distinct days inside the week, so the daily chart is not one tall spike.
    const dayOffsets = shuffled([0, 1, 2, 3, 4, 5, 6])
      .slice(0, week.count)
      .sort((a, b) => a - b);
    const doneFlags = shuffled(
      Array.from({ length: week.count }, (_unused, index) => index < week.done),
    );

    dayOffsets.forEach((dayOffset, index) => {
      planned.push({
        dueDate: addDays(today, weekStartOffset + dayOffset),
        status: doneFlags[index] ? 'DONE' : 'TODO',
      });
    });
  });

  const upcomingOffsets = [
    0,
    ...shuffled([1, 2, 3, 4, 5, 6, 7])
      .slice(0, UPCOMING_COUNT - 1)
      .sort((a, b) => a - b),
  ];
  for (const dayOffset of upcomingOffsets) {
    planned.push({ dueDate: addDays(today, dayOffset), status: 'TODO' });
  }

  return planned;
}

/** A plausible finishing time: within a couple of days of the due date. */
function completionTimestamp(dueDate: IsoDate, now: Date): Date {
  const dayShift = randomInt(-2, 2);
  const workingDay = parseIsoDate(addDays(dueDate, dayShift)).getTime();
  const stamp = workingDay + randomInt(9, 18) * 3_600_000 + randomInt(0, 59) * 60_000;
  // Never claim something was finished in the future.
  return new Date(Math.min(stamp, now.getTime() - 3_600_000));
}

/** Tasks are filed a few days to a couple of weeks before they are due. */
function creationTimestamp(dueDate: IsoDate, now: Date): Date {
  const filed = parseIsoDate(addDays(dueDate, -randomInt(3, 14))).getTime();
  const stamp = filed + randomInt(8, 17) * 3_600_000 + randomInt(0, 59) * 60_000;
  return new Date(Math.min(stamp, now.getTime() - 3_600_000));
}

/* -------------------------------------------------------------------------- */
/* Seeding                                                                    */
/* -------------------------------------------------------------------------- */

interface TaskRow {
  projectId: string;
  creatorId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: Date;
  status: TaskStatus;
  completedAt: Date | null;
  createdAt: Date;
}

/** A project plus the cursors that drive its round-robin assignment. */
interface ProjectPool {
  id: string;
  memberIds: readonly string[];
  titles: readonly TaskSeed[];
  titleCursor: number;
  assigneeCursor: number;
  creatorCursor: number;
}

async function main(): Promise<void> {
  const now = new Date();
  const today = toIsoDate(now);

  /* 1. Users — upserted by email, so existing logins and sessions survive.
        A username held by a *different* account would make that upsert fail on
        a raw unique-constraint error, so check for it first and say so. */
  const takenUsernames = await prisma.user.findMany({
    where: {
      username: { in: USERS.map((seed) => seed.username) },
      email: { notIn: USERS.map((seed) => seed.email) },
    },
    select: { username: true, email: true },
  });
  if (takenUsernames.length > 0) {
    const held = takenUsernames.map((row) => `${row.username} (held by ${row.email})`).join(', ');
    throw new Error(
      `Cannot seed: these usernames belong to other accounts — ${held}. ` +
        'Rename those accounts, or run `npm run db:reset` for a clean database.',
    );
  }

  const userIds = new Map<string, string>();
  for (const seed of USERS) {
    const passwordHash = await hashPassword(SEED_PASSWORD);
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        username: seed.username,
        displayName: seed.displayName,
        passwordHash,
        timezone: seed.timezone,
        // Pin the timezone so the first login does not overwrite it with
        // whatever the browser reports.
        timezoneAuto: false,
      },
      create: {
        email: seed.email,
        username: seed.username,
        displayName: seed.displayName,
        passwordHash,
        timezone: seed.timezone,
        timezoneAuto: false,
      },
      select: { id: true },
    });
    userIds.set(seed.username, user.id);
  }

  const ada = userIds.get('ada');
  const grace = userIds.get('grace');
  const alan = userIds.get('alan');
  if (!ada || !grace || !alan) {
    throw new Error('Seed users were not created — aborting before touching projects.');
  }

  /* 2. Projects — the previous seed's two projects are removed first. Matching
        on the name *and* a seeded owner means a project you created yourself is
        safe even if it shares a name. The FKs are ON DELETE CASCADE, so this
        takes their tasks and memberships with them and nothing else. */
  const removed = await prisma.project.deleteMany({
    where: {
      name: { in: [WEBSITE_REDESIGN_NAME, PLATFORM_MIGRATION_NAME] },
      ownerId: { in: [ada, grace, alan] },
    },
  });

  const website = await prisma.project.create({
    data: {
      name: WEBSITE_REDESIGN_NAME,
      description: 'Rebuild the public marketing site on the new design system, page by page.',
      ownerId: ada,
      members: {
        create: [
          { userId: ada, role: 'OWNER' },
          { userId: grace, role: 'MEMBER' },
          { userId: alan, role: 'MEMBER' },
        ],
      },
    },
    select: { id: true },
  });

  const migration = await prisma.project.create({
    data: {
      name: PLATFORM_MIGRATION_NAME,
      description: 'Move every remaining service off the legacy cluster before the end of Q4.',
      ownerId: grace,
      members: {
        create: [
          { userId: grace, role: 'OWNER' },
          { userId: alan, role: 'MEMBER' },
        ],
      },
    },
    select: { id: true },
  });

  /* 3. Tasks — alternating between the two projects, round-robin across each
        project's own members. */
  const pools: ProjectPool[] = [
    {
      id: website.id,
      memberIds: [ada, grace, alan],
      titles: WEBSITE_TASKS,
      titleCursor: 0,
      assigneeCursor: 0,
      creatorCursor: 1,
    },
    {
      id: migration.id,
      memberIds: [grace, alan],
      titles: MIGRATION_TASKS,
      titleCursor: 0,
      assigneeCursor: 0,
      creatorCursor: 1,
    },
  ];

  const planned = planTasks(today);

  // Slots alternate between the pools, so each pool must have at least its half
  // of the plan in titles. Without this the overflow would surface as an opaque
  // "cannot destructure undefined" the moment anyone edits PAST_WEEKS.
  pools.forEach((pool, index) => {
    const needed = Math.ceil((planned.length - index) / pools.length);
    if (needed > pool.titles.length) {
      throw new Error(
        `Project pool ${index} needs ${needed} task titles but only ${pool.titles.length} are ` +
          'defined. Add titles, or lower the counts in PAST_WEEKS / UPCOMING_COUNT.',
      );
    }
  });

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const rows: TaskRow[] = [];
  let doneCount = 0;
  let unassignedCount = 0;
  let monthTotal = 0;
  let monthDone = 0;

  planned.forEach((plan, slot) => {
    const pool = pools[slot % pools.length];
    const [title, description] = pool.titles[pool.titleCursor];
    pool.titleCursor += 1;

    let assigneeId: string | null = null;
    if (UNASSIGNED_SLOTS.has(slot)) {
      unassignedCount += 1;
    } else {
      assigneeId = pool.memberIds[pool.assigneeCursor % pool.memberIds.length];
      pool.assigneeCursor += 1;
    }

    const creatorId = pool.memberIds[pool.creatorCursor % pool.memberIds.length];
    pool.creatorCursor += 1;

    const isDone = plan.status === 'DONE';
    if (isDone) doneCount += 1;
    if (plan.dueDate >= monthStart && plan.dueDate <= monthEnd) {
      monthTotal += 1;
      if (isDone) monthDone += 1;
    }

    rows.push({
      projectId: pool.id,
      creatorId,
      assigneeId,
      title,
      description: description ?? null,
      priority: randomPriority(),
      dueDate: parseIsoDate(plan.dueDate),
      status: plan.status,
      // A TODO task never carries a completion timestamp.
      completedAt: isDone ? completionTimestamp(plan.dueDate, now) : null,
      createdAt: creationTimestamp(plan.dueDate, now),
    });
  });

  await prisma.task.createMany({ data: rows });

  /* 4. Summary — the README quotes these numbers, so print enough to check. */
  const overdue = rows.filter(
    (row) => row.status === 'TODO' && toIsoDate(row.dueDate) < today,
  ).length;

  console.log('');
  console.log(
    `Seeded on ${today} (window ${addDays(today, WINDOW_START_OFFSET)} → ${addDays(today, 7)})`,
  );
  if (removed.count > 0) {
    console.log(`  Replaced ${removed.count} existing seeded project(s).`);
  }
  console.log(`  Users:      ${USERS.length}  (ada, grace, alan — password: ${SEED_PASSWORD})`);
  console.log(`  Projects:   2  (${WEBSITE_REDESIGN_NAME}, ${PLATFORM_MIGRATION_NAME})`);
  console.log(`  Tasks:      ${rows.length}  (${unassignedCount} unassigned, ${overdue} overdue)`);
  console.log(
    `  Overall:    ${doneCount} / ${rows.length} done = ${formatPercent(toPercent(doneCount, rows.length))}`,
  );
  console.log(
    `  This month: ${monthDone} / ${monthTotal} done = ${formatPercent(toPercent(monthDone, monthTotal))}  (${monthStart} → ${monthEnd})`,
  );
  console.log('');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Seed failed:');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
