# Decisions

Every judgement call made while building this app, and why. The brief asked for
autonomous work, so anything it left open was decided here rather than by
asking.

---

## 1. The three assumptions in the brief were left at their defaults

The brief flagged three assumptions and said to change them only if the company
needed it. No signal was given either way, so all three stayed as written:

| Assumption         | Kept as                | Where to change it                                                       |
| ------------------ | ---------------------- | ------------------------------------------------------------------------ |
| UI language        | English, left-to-right | n/a — no localisation layer was added                                    |
| Week start         | Monday                 | `WEEK_STARTS_ON` in `.env` (0 = Sunday … 6 = Saturday)                   |
| Productivity basis | `dueDate`              | `src/lib/productivity.ts` + the queries in `src/server/queries/stats.ts` |

Switching the work week to Saturday is a one-character env change
(`WEEK_STARTS_ON=6`) and needs no code edit — every weekly boundary in the app
reads that single constant.

## 2. `dueDate` is a calendar date, not an instant

`Task.dueDate` is a Postgres `DATE` column. A task due on 19 Sep 2026 is due on
the 19th for everyone, whatever timezone they are reading from — a due date is
a human commitment, not a moment in time.

This keeps the timezone rule sharp: **the viewer's timezone decides which
calendar date counts as "today", and nothing else.** So:

- "Overdue" = `status = TODO` and `dueDate < today-in-viewer's-timezone`.
- A daily/weekly/monthly period resolves to a pair of calendar dates using the
  viewer's timezone, then tasks are matched on plain date comparison.

The alternative — storing a timestamp and converting it per viewer — makes a
task due "19 Sep" silently become the 18th for a colleague further west. That
is the classic off-by-one, and `src/lib/productivity.test.ts` has a regression
test pinning the behaviour.

## 3. Productivity is computed from pre-aggregated day counts

`src/lib/productivity.ts` is pure: no clock, no database, no I/O. It takes
`{ date, total, done }[]` and a date range and folds them into
`{ done, total, percent }`.

Each stats view issues **one** `groupBy` query that returns those day counts
(the project stats view groups by assignee as well), and every bar in the chart
plus the headline number plus the per-member table is derived from that single
result set in memory. No per-bar and no per-member query — the charts are 30 or
12 buckets wide and would otherwise be an obvious N+1.

`percent` is `null` rather than `0` when the denominator is 0, and
`formatPercent(null)` renders `—`. The two cases are genuinely different and
the UI never conflates them.

## 4. Sessions store an HMAC, not the raw token

`Session.id` is `HMAC-SHA256(SESSION_SECRET, cookieToken)`. The cookie holds a
256-bit random token; the database never sees it. A leaked database dump
therefore cannot be replayed as a login. The schema is unchanged from the brief
— `id`, `userId`, `expiresAt` — the id simply happens to be a derived value,
and this is what `SESSION_SECRET` is for.

Sliding expiry is split in two because of how Next.js works:

- the **database row** is pushed back out to 30 days whenever a session is used
  past its halfway mark (done in `getCurrentUser`);
- the **cookie** is re-issued with a fresh 30-day expiry by `middleware.ts` on
  every request.

Server Components cannot write cookies in Next.js, so doing the cookie half in
middleware is what makes the session genuinely sliding rather than a hard
30-day cut-off.

## 5. Middleware does a cheap check; the real check is server-side

`middleware.ts` runs on the Edge runtime, where Prisma is not available. It
therefore only checks whether a session cookie is _present_ and redirects to
`/login` if not. Actual session validation — is the row real, is it expired,
does the user still exist — happens in `requireUser()`, which every protected
page and every server action calls. A forged cookie gets past middleware and
straight into a redirect from `requireUser()`.

## 6. Login rate limiting is stored in the database

The brief specified 5 failed attempts per identifier per 15 minutes but did not
include a table for it, so a `LoginAttempt` model was added. An in-memory
counter was rejected: it resets on every deploy and does not hold across more
than one server process, which makes the limit decorative in production. Rows
older than the window are pruned on each attempt, so the table stays small.

The limit is keyed on the identifier as typed (lowercased), which is what the
brief asked for. Note this is deliberately _not_ keyed on IP: it protects an
individual account from being guessed at, and the trade-off is that a
determined attacker can lock a known username out of logging in for 15
minutes. For an internal tool behind the company network that is the right way
round; a public product would want both keys.

## 7. Usernames are stored lowercase

The brief requires usernames to match `[a-z0-9_]` _and_ to be case-insensitively
unique. Since the allowed alphabet has no uppercase in it, normalising input to
lowercase on the way in makes the plain `@unique` constraint case-insensitive
for free — no `citext` extension, no functional index, no chance of two rows
racing past a case-insensitive lookup. `MyName` typed at signup becomes
`myname`. Emails are normalised the same way.

## 8. Timezone auto-detection has an opt-out flag

The brief says to set the timezone from the browser on first login. A
`User.timezoneAuto` boolean was added: the login and signup forms post the
browser's `Intl.DateTimeFormat().resolvedOptions().timeZone`, and the server
applies it only while that flag is true. Editing the timezone in Settings sets
it to false, so a deliberate choice is never silently overwritten by the next
login from a laptop in another country.

Without the flag the only way to tell "never set" from "set to UTC on purpose"
would be to treat UTC as a sentinel, which quietly breaks for everyone actually
working in UTC.

## 9. Removing a member keeps their work

Per the brief, removing a project member nulls out `assigneeId` on their tasks
but leaves the tasks themselves. `Task.assigneeId` is `ON DELETE SET NULL`;
`creatorId` is not nullable, so history stays attributable. Deleting a project
cascades to its members and tasks — that is the point of the confirm dialog.

## 10. Stack choices

| Choice                                             | Why                                                                                                                                                                                                                               |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@node-rs/argon2` over `argon2`                    | Same Argon2id algorithm, prebuilt native binaries, so `npm install` needs no compiler toolchain on a new machine. Parameters follow the OWASP cheat sheet: 19 MiB, 2 iterations, parallelism 1.                                   |
| Prisma 7 with `prisma-client-js`                   | Current stable line.                                                                                                                                                                                                              |
| Postgres on host port **5434**                     | 5432 and 5433 were already taken by other containers on the machine this was built on. Change the left-hand side of the `ports:` mapping in `docker-compose.yml` and the port in `DATABASE_URL` together if you want the default. |
| Next.js `build` uses webpack, `dev` uses Turbopack | Fast local feedback, most conservative production build.                                                                                                                                                                          |
| No `next-intl`, no design system                   | The brief asked for shadcn/ui components used as-is.                                                                                                                                                                              |

## 11. No `loading.tsx` on pages that host a server action

This one cost a long afternoon and is worth writing down properly.

**Symptom.** In a _production build only_ (`next build` + `next start`, on both
the webpack and the Turbopack builder), submitting a server action from a page
that has a route-level `loading.tsx` would leave the form stuck on its pending
label — "Creating…", "Adding…" — forever. The database write always succeeded
and the POST always came back `200` with a complete RSC payload containing the
action's return value. `next dev` never reproduced it.

**What is actually happening.** A probe inside the dialog showed React _does_
re-render with the new state, but the surrounding transition never commits, so
the effects never run and the DOM is never updated. The transition is waiting
on the re-rendered route tree that ships alongside the action result, and a
Suspense boundary in that tree stops it from ever finishing. React does not
show a fallback during a transition — it waits — so the UI simply freezes on
the pending state with no error anywhere.

**What was ruled out**, each by experiment:

- the `router.push` in the create-project dialog (removing it did not help);
- a server-side `redirect()` instead (that broke the _destination_ page's
  actions too, because the stuck transition outlives the navigation);
- `revalidatePath` — including removing it entirely;
- the cookie-sliding in `middleware.ts`;
- the bundler — Turbopack behaves identically;
- the arrival path — a full page load, a client-side navigation and an
  action-redirect all failed the same way.

Moving the skeleton from `loading.tsx` into an in-page `<Suspense>` did **not**
help: any Suspense boundary around the changing part of the tree does it.

**The fix.** Pages that host a server action have no Suspense boundary:

| Route                  | Skeleton? | Why                              |
| ---------------------- | --------- | -------------------------------- |
| `/dashboard`           | yes       | read-only, no actions            |
| `/projects/[id]/stats` | yes       | read-only, no actions            |
| `/projects`            | no        | create-project runs here         |
| `/projects/[id]`       | no        | task and member actions run here |
| `/settings`            | no        | the settings form runs here      |

The three action-hosting pages are each a single aggregated query, so they
render fast enough that the missing skeleton is not noticeable — Next.js keeps
the previous page on screen until the new one is ready. This is a trade the
brief did not anticipate: it asked for loading skeletons, and two of the five
data routes have them rather than all five. Correct forms beat decorative
skeletons.

**Also from the same investigation**: `createProjectAction` and
`deleteProjectAction` finish with a full document load (`window.location.assign`)
rather than `router.push`. Both navigate to a different route immediately after
writing, and a full load is the one navigation that cannot be caught up in the
action's own transition. It costs one page load on two infrequent operations.

If this is ever revisited on a newer Next.js, the check is thirty seconds:
build for production, open `/projects`, create a project, and see whether the
button unsticks.

## 12. Things intentionally left out

- **Password reset / email delivery.** Not in the brief and it needs an SMTP
  provider decision. Users are created by signup or by the seed.
- **Changing your password in Settings.** Settings covers display name and
  timezone, which is what the brief specified.
- **Project roles beyond OWNER/MEMBER**, per the data model given.
- **Soft deletes.** Deleting a project really deletes it.
