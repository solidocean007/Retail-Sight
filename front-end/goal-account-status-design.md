# Goal Account Status — Design Doc

**Status:** Draft, pending decisions
**Date:** 2026-07-25 (rev 2)
**Branch:** to be built off `main` as its own feature branch

---

## The core insight

**This is not about explaining unexecuted accounts.** It's about capturing
attempts that didn't land.

A company goal has two independent parts:

- **Scope** — the accounts an admin selected when building the goal, which
  become each rep's `goalAssignments`. This is a *candidate pool*.
- **Quota** — `perUserQuota`, how many displays each rep must get, regardless
  of how big the pool is. "Get 5 from anywhere", "get 2 but only Food Lions."

So a rep might have 100 accounts in scope and a quota of 5. They execute 5 and
they're done. **The other 95 need no explanation — that's a successful
outcome, not 95 failures.**

The interesting case is a rep who lands 2 of 5. Asking them to account for the
other 98 accounts would be absurd friction. But asking them to log the handful
they *actually pitched and got a no on* is reasonable — that's work they did,
and they have a reason to want it recorded.

**Reframe:** a record here means *"I asked here and it didn't happen,"* not
*"here is why this account is blank."* Opt-in by nature, only exists where a
rep did work, and it reads as credit rather than compliance.

### Why partial coverage is still valuable

Completeness is not required for this to work, because the **ratio** carries
the signal:

- 2 executions + 18 logged attempts → rep is grinding, needs help or the goal
  was unrealistic
- 2 executions + 0 logged attempts → unknown; a different conversation

Even sparse data separates "trying and failing" from "not trying," which is
exactly what admins can't see today. Anything logged is strictly better than
the current state of total silence.

---

## Problem being solved

Today an unmet goal is silent. Admins see *that* execution is missing, never
*why*. That's the difference between a coverage problem and an obstacle
problem, and they need opposite responses.

Applies to **all goal types** — company goals and Gallo goals — not just
playbook-linked goals. Logging is optional everywhere; reps answer if and when
they want to. The kinds differ only in how admins interpret the result. See
"Gallo goals — resolved."

---

## Current state of the code

There's a partial, playbook-scoped version of this in the
`agents/playbook-forecasting-integration` branch.

**Exists and works:**

- `helpNeededOptions?: string[]` on `CollectionType` (`src/types/library.ts`),
  admin-curated in `PlaybookForm`. Defaults: "Help building display",
  "Assistance asking for approval", etc.
- Goal ↔ playbook link on `CompanyGoalType`: `playbookId`, `playbookTitle`,
  `playbookInstructions`, `playbookReason`.

**Written but entirely unused (no imports anywhere):**

- `src/components/Playbooks/playbookForecastHelpers.ts` —
  `addPlaybookForecast`, `fetchPlaybookForecasts`,
  `buildPlaybookForecastSummary`, targeting a `playbookForecasts` collection.
- `PlaybookForecast` / `CreatePlaybookForecastInput` / `PlaybookForecastSummary`.
- `PlaybookUserActivity` with `status: "blocked"`, `blockerReason`, `feedback`.
- `PlaybookDetailView` placeholder copy: *"Open the goal workspace to view rep
  account responses and blocker breakdowns."* No such view exists.

**Cleanup this implies:** once the generic model lands, delete or fold in
`playbookForecastHelpers.ts` and the forecast/activity types. Two systems for
one concept is worse than either alone.

> ⚠️ **Verify field names before implementing.** Accounts and goals have been
> refactored more than once; some fields cited here may be vestigial. Everything
> below was read from current `main`, but confirm intent before building on it.

---

## Why goal-scoped, not playbook-scoped

1. **Volume.** Playbook-linked goals are a subset of all goals; flags limited
   to them would be too sparse for any rollup to mean anything.
2. **Reps live in goals.** Assignment is by goal. Playbooks are the "how".
3. **The playbook rollup comes free.** Goals already carry `playbookId`, so a
   playbook aggregates the flags of goals pointing at it. The flag never needs
   to know playbooks exist.

---

## Proposed data model

New top-level collection: **`goalAccountReports`**

*(Renamed from `goalAccountStatus` — there is no status field, see below.)*

### No status enum

An earlier draft had `blocked` / `not_applicable` as statuses. Collapsed,
because **reps don't think in statuses.** The action is one thing — "I couldn't
do this, here's why" — and the reasons already carry the distinction. Making a
rep choose a status *and then* a reason is an extra decision they don't care
about, on the exact screen where friction decides adoption.

The existence of a record means: *the rep reported something about this account
on this goal.* No record means nothing was reported. That's the whole model.

Also deliberately absent: `executed` (provable from `submittedPosts` /
`submittedPostId` — a second source of truth would drift) and `planned` (asks
reps to record intent for accounts they haven't touched).

### Keyed reasons

Reasons are **keyed**, not free strings, so behavior can be built on specific
ones without depending on wording that nobody promised to keep stable. An admin
renaming a label must never change meaning or break a query.

```ts
interface ReasonOption {
  key: string;      // stable identity — never changes once created
  label: string;    // display text — freely editable
  builtIn?: boolean;
}
```

**One built-in list, used everywhere** — every goal kind, playbook-linked or
not. No per-playbook list, no per-company customization in v1.

| key | label |
|---|---|
| `not_interested` | Not interested |
| `no_room` | No room |
| `not_displayable` | Not displayable |
| `cost_too_much` | Cost too much |
| `other` | Other |

`no_room` and `not_displayable` are **distinct**: no space *right now* versus
this account doesn't do displays *at all*. Only the latter is structural, and
it's the one that drives account removal (and later, account-level
declarations).

**Free text** lives in `note`, always available regardless of reasons chosen.

Notes on what this replaces and defers:

- The playbook's `helpNeededOptions` is **retired** for this purpose — one list
  everywhere avoids a merge problem nobody wanted.
- Company-specific custom reasons are deferred. If added later, they get
  generated stable keys (`custom_a1b2c3`) and resolve labels from config, so
  nothing about this model has to change.
- An earlier draft had a `not_applicable` key. **Dropped** — it reads as
  system jargon to sales people. `not_displayable` carries the same structural
  meaning in language reps actually use.

```ts
type GoalKind = "company" | "gallo";

interface GoalAccountReport {
  id: string;              // deterministic, see below
  companyId: string;

  goalKind: GoalKind;
  goalId: string;
  goalTitle?: string;      // denormalized for admin lists

  // Account identity — see "two-key problem"
  accountNumber?: string;  // company goals, and matched Gallo accounts
  oppId?: string;          // Gallo only
  accountName?: string;    // denormalized for display

  userId: string;
  userFirstName?: string;
  userLastName?: string;
  salesRouteNum?: string;

  reasonKeys: string[];    // built-in reserved keys and/or custom_* keys
  note?: string;           // free text, always allowed

  resolvedAt?: string | null;   // admin triage state, not rep-facing
  resolvedBy?: string | null;

  createdAt: string;
  updatedAt: string;
}
```

### Deterministic document ID

```
`${goalKind}_${goalId}_${accountNumber ?? oppId}_${userId}`
```

One record per rep per account per goal — re-recording overwrites rather than
appending. Same pattern as the per-user notification IDs.

### Why a separate collection, not embedded in the goal

`goalAssignments` is an array on the goal doc (and `accounts[]` on the Gallo
goal doc). Embedding reports there would mean many reps writing one document
(contention), pressure on the 1 MB limit, no way to scope a rule to a rep's own
array entry, and no cross-goal query — "every open report this month" would
require scanning all goals.

---

## The two-key problem

| | Company goals | Gallo goals |
|---|---|---|
| Assignment | `GoalAssignmentType { uid, accountNumber }` | `accounts[] { oppId, distributorAcctId, ... }` |
| Account key | `accountNumber` | `oppId` + `distributorAcctId` |
| Account name | always available | optional — `EnrichedGalloAccountType.accountName?` |

Gallo accounts are matched to Firestore accounts during enrichment
(`enrichAccounts.ts`, `matchAccountWithSelectedStoreForAdmin.ts`), but not
every Gallo account matches. A report on an unmatched account has no
`accountNumber`, so it can't join to account data for filtering by chain, city,
or type. It still displays, but won't participate in account-based reporting.

**Decided:** unmatched Gallo accounts are reportable. `oppId` is the identity;
`accountNumber` is optional enrichment that may never arrive.

---

## Capture UX — the thing that decides success

Value depends entirely on reps actually using it. If it's a separate flow they
have to remember, it won't get used, and the concept will look like it failed
when the placement did.

**Principle:** it lives where reps already interact with the goal — the same
surface where they'd submit a display. Never a separate "flags" screen.

Rough shape:

- On a goal's account row, next to "submit display": a secondary action —
  "Asked, no display" or similar.
- One tap → pick one or more reasons from a chip list → optional note → save.
- No requirement to address every account. Most rows will never be touched,
  by design.

Language matters here. Frame it as logging effort ("Asked, didn't land"), not
as justifying absence ("Why no display?"). Same data, very different adoption.

**Decided:** one built-in reason list everywhere (see "Keyed reasons"). No
per-goal or per-playbook lists — reps see the same five options regardless of
goal kind, which also means the UI is identical everywhere.

---

## Playbook rollup

```
goals where playbookId == X  →  goalAccountReports where goalId in [...]
```

**Decided: no denormalization.** In practice a playbook is used for one goal,
occasionally a few — never near the 30-value `in` limit. Query goals, then
reports. Revisit only if playbook reuse turns out to be common.

Replaces the placeholder copy in `PlaybookDetailView`.

---

## Notifications — daily digest, never per-report

**No per-instance notifications.** A rep working through 18 accounts in an
afternoon must not fire 18 alerts. This is a scheduled digest, not an event
stream — so it does **not** use the `activityEvents` fan-out.

**Cadence:** one daily recap per goal.

**Recipients:**

- **The goal's creator** — their scoping decisions are what's being critiqued.
- **The rep's supervisor**, following `reportsTo` wherever it points (a select
  few report to a super-admin instead; the digest follows the same field).
  Supervisors get **one company-wide recap**, not one per rep.

**Surfaces:** the in-app goal review screen is the primary artifact. Email is a
recap/reminder pointing at it.

Implementation: a scheduled function shaped like
`processScheduledDeveloperNotifications` (already runs on a schedule and claims
work transactionally), aggregating each day's reports per goal.

---

## Admin acknowledgment and account removal

The admin's unit of work is the **goal**, not the individual report. An admin
who assigned a goal across 150 accounts and gets back a wave of "can't do this"
is never going to click through them one at a time — designing for that
guarantees the feature is ignored.

So the goal review screen shows **aggregates**: "23 reports · 12 no room ·
8 not interested · 3 cost too much", grouped by reason and account, with **bulk
acknowledge** as the primary action and per-account acknowledgment available
when an admin wants the precision.

### Acknowledgment has a consequence

Acknowledging isn't just marking something read. When an admin accepts that an
account can't be executed, that account is **removed from the goal**:

- **Not deleted.** It stays visible, dimmed/disabled, with its history intact.
- **Excluded from goal completion math.**
- **Reversible** — stores reopen, admins misclick, seasons change.
- **Attributed** — who removed it, when, and why.

This is also the loop closure for reps. Rather than a "your feedback was
reviewed" badge, the rep sees the account visibly drop out of their goal. The
report had an effect, which is the only acknowledgment that actually reads as
real.

### Mechanism differs by goal kind

**Gallo — already works.** Set `accounts[].status` to `"disabled"`. Every
existing view already filters to `"active"`, so the account disappears from
counts with no new calculation code.

**Company goals — needs a schema change.** `GoalAssignmentType` is currently
just `{ uid, accountNumber }` with no status. It needs removal state:

```ts
interface GoalAssignmentType {
  uid: string;
  accountNumber: string;

  // NEW — absent means active, for backward compatibility
  status?: "active" | "removed";
  removedAt?: string;
  removedBy?: string;
  removedReasonKey?: string;
}
```

> ⚠️ This is the one place this feature touches **live production data**.
> Treat absent `status` as `"active"` so existing goals keep working untouched.

Removal is **per-assignment** (one rep's account on one goal). Two reps sharing
an account on the same goal is rare enough not to design around.

### Effect on completion math

- **Gallo:** fewer active accounts, so the completion percentage rises. Falls
  out of the existing filters.
- **Company goals:** `perUserQuota` is a flat target ("get 5"), not a
  percentage of accounts, so removal does **not** change it. The quota does not
  auto-adjust — an admin set that number deliberately and silently lowering it
  would be surprising.

  Instead, **detect and surface impossibility**: when a rep's remaining active
  assignments fall below their quota, flag it — *"3 accounts left against a
  target of 5."* The admin decides whether to lower the quota or accept the
  miss. Detect, don't decide.

### Audit trail

Split by reader, so the goal doc doesn't grow an unbounded event log:

- **Goal doc** carries only what's needed to be *correct*: `status`,
  `removedAt`, `removedBy`, `removedReasonKey` on the assignment.
- **Report doc** carries the *narrative*: `resolvedAt`, `resolvedBy`, and
  `resolution` (`"removed_from_goal"` | `"acknowledged_no_action"`).

An un-removal clears the assignment fields and writes a new resolution on the
report, so history stays readable in one place.

---

## Firestore rules

This data contains candid commentary about accounts and possibly named buyers.
It must **not** fall through to the temporary catch-all
(`match /{path=**} { allow read, write: if request.auth != null; }`), which
would expose every company's flags to any authenticated user.

```
match /goalAccountReports/{reportId} {
  allow read: if isInCompany(resource.data.companyId);

  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid
    && isInCompany(request.resource.data.companyId);

  allow update: if resource.data.userId == request.auth.uid
    || isOwnCompany(resource.data.companyId);

  allow delete: if isOwnCompany(resource.data.companyId);
}
```

Rules live in `/firestore.rules`, deployed via
`firebase deploy --only firestore:rules`.

Indexes for `firestore.indexes.json`:

- `companyId` + `createdAt desc` — admin inbox
- `companyId` + `resolvedAt` + `createdAt desc` — open vs handled
- `goalId` + `createdAt desc` — per-goal breakdown
- `userId` + `createdAt desc` — a rep's own history
- `companyId` + `reasonKeys` (array-contains) + `createdAt desc` — filter by
  reason, e.g. every open `not_applicable` request

Note: with reasons as an array, "filter by reason" is `array-contains`, which
allows only one such clause per query. Filtering by two reasons at once needs
client-side intersection or a composite denormalized field — fine at this
scale, worth remembering.

---

## Account-level declarations (planned, not v1)

Most reasons are goal-specific and repeating them per goal is acceptable —
"buyer said no this month" is genuinely a per-goal fact.

But one class of reason is structural and outlives any goal: **the account
cannot take a display at all.** Remodeling, chain policy forbids it, no floor
space, permanently closed. Re-logging that on every goal is exactly the
repetitive friction that kills adoption.

Direction (deferred, but worth designing around):

- Separate collection, e.g. `accountDeclarations`, keyed by
  `companyId` + `accountNumber`.
- Records: `status: "non_displayable"`, reason, `declaredBy`, `declaredAt`,
  optional `clearedAt` / `clearedBy`.
- **Surfaced when an admin builds a goal** — while selecting account scope,
  flagged accounts show a badge: *"Declared non-displayable by J. Smith on
  2026-06-14."*
- **Non-blocking.** It informs, it doesn't prevent. The admin can still scope
  the account; they just do it knowingly.
- No expiry machinery needed in v1 — showing *who* and *when* lets the admin
  judge staleness themselves. A declaration from two years ago reads as stale
  without the system having to decide that.

Keeping this out of v1 is fine, but the v1 schema shouldn't foreclose it: a
goal-scoped record and an account-level declaration are separate collections,
so this layers on cleanly later.

---

## Gallo goals — resolved (decided 2026-07-25)

**The rep experience is identical for both goal kinds.** Logging is optional
everywhere. Reps answer about execution if and when they want to; nothing is
required, and no screen nags them for full coverage.

The kinds differ only in how admins should *interpret* the data:

| | Company goal | Gallo goal |
|---|---|---|
| Account scoping | `goalAssignments[]` | `accounts[].status === "active"` |
| Target | `perUserQuota` (e.g. "get 5") | each `oppId` is an opportunity |
| Unexecuted account | expected — pool is bigger than quota | a real gap |
| Rep obligation to log | **none** | **none** |

So on a Gallo goal, "accounts with no outcome recorded" is a number an admin
can reasonably act on, whereas on a quota-based company goal it's noise. That's
an admin-side reading of the same data — **not** a different rep-side UX, and
not a compliance expectation.

Practical consequences:

- **Unmatched Gallo accounts must be flaggable.** `oppId` is the identity;
  `accountNumber` is optional enrichment that may never arrive. *(Settles what
  was previously open decision #3.)*
- **Executed is derivable** on both — `submittedPostId` on the Gallo account
  entry, `submittedPosts` on company goals. Never re-record it.

### `accounts[].status` — what it actually is

Originally assumed to be Gallo-provided. **It is not.** It's Displaygram's own
admin-side include/exclude toggle, and it's load-bearing across at least nine
files:

- `EditGalloGoalAccountTable` renders it as a checkbox
  (`checked={account.status === "active"}`)
- `EditGalloGoalModal` defaults it (`a.status ?? "active"`) and counts
  `"active"` as assigned
- `GalloGoalCard`, `GalloGoalsTable`, `GalloGoalsHeatMap`,
  `GalloGoalProgressOverlay`, `MyGalloGoalCard`, `GalloGoalImporter`,
  `GalloAccountImportTableCreate` all filter to `"active"`

**It is the Gallo counterpart to `goalAssignments`** — how an admin scopes
which accounts are in play. That's why the rep-facing flag layer can sit
identically on top of both kinds: both already have an admin scoping
mechanism, they just spell it differently.

#### Gallo gets account removal for free

`accounts[].status` is **admin-set scoping**; reason keys are **rep-reported
feedback**. Different actors, and they compose into the removal workflow
described below.

Critically, **Gallo already excludes non-active accounts from its math.**
`GalloGoalCard`, `GalloGoalsTable`, `GalloGoalProgressOverlay`, and
`MyGalloGoalCard` all filter to `status === "active"` today. Setting an account
to `"disabled"` removes it from the denominator with no new calculation code.

Company goals have no equivalent — see "Admin acknowledgment and removal".

### Integration boundary

Gallo Axis only consumes `oppId`, the Firestore image URL, `closedBy`, and
units (via `galloSendAchievement`). **Flag data is internal only** and is never
sent back to Gallo. No changes to the outbound payload.

---

## Out of scope for v1

- Account-level declarations (see above) — designed for, not built.
- Pushing blocker data back to Gallo (no channel; `galloSendAchievement` is
  execution-only).
- Threaded discussion on a flag — resolve/unresolve is enough.
- Historical backfill; collection starts at launch.

---

## Decisions

**Settled:**

- ~~Include `planned` status?~~ No — the pool model makes it meaningless for
  company goals, and for Gallo the target is simply "all of them."
- ~~Do reps explain every unexecuted company-goal account?~~ No — log attempts
  only. Sparse coverage is expected and still informative via the ratio.
- ~~Do Gallo goals follow pool+quota?~~ No — every `oppId` is a target. But
  this only changes how admins *read* the data. **Rep-side logging is optional
  and identical for both kinds.**
- ~~What is `GalloGoalType.accounts[].status`?~~ Displaygram's own admin
  include/exclude toggle (the Gallo counterpart to `goalAssignments`), used
  across nine files. Not Gallo-provided. This feature doesn't write to it, but
  a rep's `not_applicable` flag is a natural prompt for an admin to flip it.
- ~~Unmatched Gallo accounts — flaggable?~~ Yes, required. `oppId` is identity;
  `accountNumber` is optional enrichment.
- ~~Where do Gallo reports live?~~ Shared `goalAccountReports` collection with
  a `goalKind` discriminator — not embedded on the goal doc.
- ~~Status enum vs reasons?~~ No status. One record = "rep reported something";
  keyed reasons carry the meaning, `note` carries free text.
- ~~Send flag data to Gallo?~~ No. Internal only.
- ~~Account-level reasons in v1?~~ No — goal-scoped v1, repeats acceptable;
  `accountDeclarations` layered on later, advisory and non-blocking.

**Remaining (recommendations given; confirm or override):**

- ~~Reason source?~~ One built-in list everywhere: not interested, no room,
  not displayable, cost too much, other. Playbook `helpNeededOptions` retired
  for this purpose; company-custom reasons deferred.
- ~~`not_applicable`?~~ Dropped as jargon. `not_displayable` is the structural
  key, in reps' own language.
- ~~Denormalize `playbookId`?~~ No. A playbook maps to ~one goal, so the
  30-value `in` limit never bites.
- ~~Notification audience and cadence?~~ Daily digest per goal, never
  per-report. Goal creator plus the rep's supervisor (following `reportsTo`),
  supervisors getting one company-wide recap. In-app goal review is primary;
  email recaps.
- ~~Does acknowledgment do anything?~~ Yes — it removes the account from the
  goal: dimmed not deleted, excluded from completion math, reversible,
  attributed. Bulk acknowledge is the primary action.
- ~~Removal scope?~~ Per-assignment (one rep, one account, one goal).
- ~~Does removal change the quota?~~ No. `perUserQuota` stays; the UI flags
  when remaining accounts fall below it. Detect, don't decide.

**Nothing blocking. The design is settled enough to build.**

### Suggested build order

1. Reason constants + `goalAccountReports` collection, rules, indexes.
2. Rep capture UI on the goal account row — the make-or-break piece. Get it in
   front of a real rep early.
3. Admin goal review screen: aggregates and bulk acknowledge.
4. `GoalAssignmentType.status` + removal + completion-math exclusion.
5. Daily digest function.
6. Playbook rollup panel, replacing the placeholder copy.

Steps 1–3 ship on their own and already answer "why didn't this happen."
Everything after is leverage on data you're collecting by then.
