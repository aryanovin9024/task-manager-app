# Task Manager

An internal task manager for small teams. People sign up, create projects and
invite colleagues by username, and every member of a project can file tasks,
assign them, set a priority and a due date, and tick them off. On top of that
sits the part the app actually exists for: a productivity view — personal on the
dashboard, per-project (and per-member) on each project's stats page — that
answers "how much of what was due this day / week / month actually got done?"
It is a Next.js 15 App Router application with Postgres behind Prisma 7, server
actions for every mutation, and shadcn/ui components for the interface.

---

## Setup

Five commands from a fresh clone. Docker must be running.

```bash
cp .env.example .env
npm install
npm run db:up
npm run db:migrate
npm run db:seed
```

Then start the dev server:

```bash
npm run dev
```

It serves <http://localhost:3000>. Log in with one of the seeded accounts below.

Two things worth knowing before you run it:

- **Postgres runs in Docker on host port 5434**, not 5432 — 5432 is usually
  already taken by another local Postgres. `npm run db:up` starts the container
  defined in `docker-compose.yml`; the port appears on both sides of the setup,
  in that file's `ports:` mapping and in `DATABASE_URL`, so change them together
  if you need a different one. `npm run db:down` stops it; the data lives in a
  named volume and survives.
- **Regenerate `SESSION_SECRET`.** `.env.example` ships with a placeholder.
  Replace it with real entropy:

  ```bash
  openssl rand -base64 32
  ```

  Changing it later invalidates every existing session, which is the intended
  behaviour — session ids in the database are HMACs derived from it.

---

## Seed credentials

`npm run db:seed` creates three users, two shared projects and 60 tasks spread
over the last 90 days and the coming week, so the charts have real shape from
the first login. All three share the same password.

| Username | Email               | Name         | Timezone         |
| -------- | ------------------- | ------------ | ---------------- |
| `ada`    | `ada@example.com`   | Ada Lovelace | Europe/London    |
| `grace`  | `grace@example.com` | Grace Hopper | America/New_York |
| `alan`   | `alan@example.com`  | Alan Turing  | Europe/London    |

**Password for all three: `password123`**

These are development accounts with a well-known password. They exist to make a
local database useful — never seed them anywhere that is reachable from outside
your machine.

Log in as either `ada` or `grace` to see two different timezones resolve "today"
differently against exactly the same data. The seed is deterministic (a
fixed-seed PRNG, no `Math.random()`) and re-runnable: it deletes the two seeded
projects — matching on the seeded name _and_ a seeded owner, so a project of
your own is safe even if it shares a name — and upserts the three users by
email. Running it twice gives you the same database and leaves anything you
created yourself alone.

Due dates move with the day you run it; the silhouette does not. Every run, on
every machine, produces:

- **60 tasks**, 30 in each project.
- **41 / 60 done overall = 68.3%.**
- **13 overdue** — still TODO with a due date in the past.
- **6 due today or in the coming week**, all still TODO.
- **3 unassigned**, placed so the "Unassigned" row appears in the 30-day,
  12-week and 12-month windows alike.
- A **13-week weekly chart** that sits around 75–100% for the older weeks and
  then slides 75% → 50% → 25% over the last three, so the trend is visible
  rather than flat.

The seed prints these counts, plus the current month's, when it finishes.

---

## The productivity formula

> **Productivity % for a period** = (tasks with a due date inside the period that
> are DONE) ÷ (tasks with a due date inside the period) × 100, rounded to one
> decimal.

The whole calculation lives in `src/lib/productivity.ts`, which is pure — no
clock, no database — and is the only place this arithmetic happens.

Five rules follow from that definition, and the UI holds all five:

1. **A denominator of 0 is not 0%.** A period with nothing due has no
   percentage at all: `toPercent` returns `null` and the UI renders `—`. "Nobody
   had anything due" and "nobody finished anything" are different facts and the
   app never conflates them.
2. **Raw counts are always shown next to the percentage** — `72.5%` never
   appears without `29 / 40 done` beside it, so 1 of 1 cannot masquerade as a
   perfect month.
3. **Period boundaries are computed in the viewing user's timezone.** The
   viewer's timezone decides which calendar date counts as "today", and that is
   the only thing it decides. Due dates themselves are calendar dates (a
   Postgres `DATE`): a task due 19 Sep is the 19th for everyone.
4. **The week starts on the day set by `WEEK_STARTS_ON`** — default Monday.
   `0` = Sunday, `1` = Monday … `6` = Saturday. Every weekly boundary in the app
   reads that one constant, so moving the work week is an env change, not a code
   change.
5. **Productivity is based on due date, not completion date.** Finishing early
   still counts towards the period the task was _due_ in. A task due next
   Tuesday and finished today does not inflate today's number.

### Worked example

Ada is in `Europe/London` with `WEEK_STARTS_ON=1`, looking at the week of
**Mon 14 Sep – Sun 20 Sep**.

Four of her tasks around that boundary:

| Task             | Due    | Status | Completed | Counts in this week?                    |
| ---------------- | ------ | ------ | --------- | --------------------------------------- |
| Rebuild the hero | 15 Sep | DONE   | 15 Sep    | yes — numerator and denominator         |
| Prune unused CSS | 16 Sep | DONE   | 11 Sep    | yes — finished early, still counts here |
| QA on iOS Safari | 18 Sep | TODO   | —         | yes — denominator only                  |
| Launch post      | 22 Sep | DONE   | 15 Sep    | **no** — due outside the week           |

Across all nine tasks with a due date between 14 and 20 Sep, six are DONE.

```
6 ÷ 9 × 100 = 66.666… → 66.7%
```

The page shows **66.7%** and **6 / 9 done**. If Ada steps back to a week where
nothing was due, the same page shows **—** and **0 / 0 done** — not 0%.

---

## Scripts

| Script                 | What it does                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run dev`          | Dev server with Turbopack on http://localhost:3000                      |
| `npm run build`        | Production build                                                        |
| `npm run start`        | Serves the production build                                             |
| `npm run lint`         | ESLint over the repo (`any` is an error)                                |
| `npm run lint:fix`     | ESLint with `--fix`                                                     |
| `npm run format`       | Prettier writes the whole repo                                          |
| `npm run format:check` | Prettier checks without writing — what CI would run                     |
| `npm run typecheck`    | `tsc --noEmit`                                                          |
| `npm test`             | Vitest, one pass                                                        |
| `npm run test:watch`   | Vitest in watch mode                                                    |
| `npm run db:up`        | Starts the Postgres container (host port 5434)                          |
| `npm run db:down`      | Stops it; the data volume is kept                                       |
| `npm run db:migrate`   | `prisma migrate dev` — applies and creates migrations                   |
| `npm run db:deploy`    | `prisma migrate deploy` — applies existing migrations, no prompts       |
| `npm run db:seed`      | Runs `prisma/seed.ts` via tsx                                           |
| `npm run db:studio`    | Prisma Studio, a table browser for the local database                   |
| `npm run db:reset`     | **Drops and recreates the database**, re-runs migrations, then the seed |

---

## Project structure

```
src/
├── app/                        # App Router. Server Components by default.
│   ├── (auth)/                 # Unauthenticated: login, signup + their layout
│   ├── (app)/                  # Everything behind a session; sidebar layout
│   │   ├── dashboard/          # Personal productivity view
│   │   ├── projects/           # Project list
│   │   │   └── [id]/           # Task board for one project
│   │   │       └── stats/      # Project + per-member productivity
│   │   └── settings/           # Display name and timezone
│   ├── page.tsx                # Redirects / → /dashboard
│   ├── layout.tsx              # Root layout: fonts, theme provider, <Toaster />
│   ├── globals.css             # Tailwind v4 theme tokens (light + dark)
│   └── not-found.tsx
│
├── components/
│   ├── ui/                     # shadcn/ui primitives, used as-is
│   ├── forms/                  # SubmitButton, FieldError, FormError
│   ├── shell/                  # Sidebar, nav, page header, user menu
│   ├── auth/                   # Login and signup forms
│   ├── projects/               # Project cards, dialogs, member management
│   ├── tasks/                  # Task board, list, item, filters, dialogs
│   ├── stats/                  # Period tabs, chart, headline, member table
│   ├── settings/               # Display name + timezone form
│   └── theme-provider.tsx      # next-themes, following the OS
│
├── lib/                        # Pure, framework-free logic
│   ├── productivity.ts         # The formula, period boundaries, chart series
│   ├── productivity.test.ts    #   …and its tests
│   ├── stats-fold.ts           # Folds grouped query rows into view shapes
│   ├── stats-fold.test.ts      #   …and its tests
│   ├── dates.ts                # Calendar-date helpers (IsoDate, timezones)
│   ├── stats-query.ts          # Reads/writes the ?period= &anchor= URL state
│   ├── task-filters.ts         # Reads/writes the task board's filter URL state
│   ├── validation.ts           # Zod schemas + the shared ActionState type
│   ├── session.ts              # getCurrentUser / requireUser
│   ├── session-constants.ts    # Cookie name and session lifetimes
│   ├── authz.ts                # Project membership checks
│   ├── config.ts               # WEEK_STARTS_ON and other constants
│   ├── env.ts                  # Environment parsed once, fails loudly
│   ├── password.ts             # Argon2id hash / verify
│   ├── prisma.ts               # One PrismaClient, via the pg driver adapter
│   └── utils.ts                # cn() — the shadcn class merger
│
├── server/                     # Server-only data access
│   ├── actions/                # 'use server' mutations bound to forms
│   ├── queries/                # Read paths, one grouped query per stats view
│   └── types.ts                # DTOs — Prisma models never reach the UI
│
├── hooks/                      # Client hooks (useActionToast, useIsMobile)
└── middleware.ts               # Cheap cookie check + sliding session cookie
```

`prisma/schema.prisma` holds the data model, `prisma/migrations/` the SQL, and
`prisma/seed.ts` the development data.

---

## Environment variables

Copied from `.env.example` into `.env`. `src/lib/env.ts` parses them once at
startup and throws with a readable message if anything is missing or malformed,
so a misconfigured environment fails immediately instead of misbehaving later.

| Variable         | Required | What it does                                                                                                                                                                                                          |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | yes      | Postgres connection string. Matches `docker-compose.yml`, which publishes the container on **host port 5434**.                                                                                                        |
| `SESSION_SECRET` | yes      | Key used to derive session ids: the database stores `HMAC-SHA256(SESSION_SECRET, cookieToken)`, never the raw cookie. At least 16 characters; generate with `openssl rand -base64 32`. Changing it logs everyone out. |
| `WEEK_STARTS_ON` | no       | First day of the week for every weekly period. `0` = Sunday … `6` = Saturday. Defaults to `1` (Monday).                                                                                                               |

---

## Testing

```bash
npm test
```

Vitest runs in a Node environment over the pure libraries — no database, no
browser, no server needed. Two suites:

- **`src/lib/productivity.test.ts`** covers the formula end to end: rounding to
  one decimal; `null` versus `0` for an empty period; inclusive period
  boundaries; weekly boundaries under `WEEK_STARTS_ON` = Sunday, Monday and
  Saturday, including weeks that straddle a month end; timezone handling, where
  the same instant is a different "today" in Tehran and Auckland and a due date
  never shifts for the viewer; a DST transition; period navigation and labels;
  the 30-day / 12-week / 12-month chart series, with a test that no task is ever
  counted in two buckets; and the `—` / `x / y done` formatting.
- **`src/lib/stats-fold.test.ts`** covers the per-member table: summing members
  onto the same day, sorting by percentage with members who had nothing due
  sorted last, tie-breaking, ignoring rows outside the selected period, and
  adding the "Unassigned" row only when there is unassigned work in the period.

Everything that could silently produce a wrong number lives in those two files,
which is why they are the pure layer: the queries above them only aggregate, and
the components below them only render.

---

## Decisions

The judgement calls — why the due date is a calendar date and not an instant,
why sessions store an HMAC, why login rate limiting is in the database, and what
was deliberately left out — are written up in [DECISIONS.md](./DECISIONS.md).
