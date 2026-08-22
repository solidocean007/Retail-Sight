# Supplier Organizations, Territories, and Scalable Pricing

Status: Design proposal for product and UX handoff  
Implementation status: Not started  
Initial pilot: Geloso Beverage Group USA / North Carolina

## Executive summary

Displaygram currently treats a `company` as all of the following at once:

- the customer and billing account;
- the security and data boundary;
- the operating team;
- the owner of users, accounts, goals, posts, and connections;
- a single geographic or organizational scope.

That model works for a local distributor, but it becomes limiting for a national supplier. A supplier such as Geloso may have national leadership, regional managers, state representatives, and hundreds of distributor relationships. Creating a separate Displaygram company for every state would fragment its data, duplicate billing and brand configuration, and make national reporting difficult.

The opportunity is to let one customer operate as a national organization while dividing its work into territories. The organization can then see national performance, regional managers can see assigned territories, representatives can focus on their own markets, and distributors can remain independent connected companies.

The recommended direction is additive: retain `companies` as the existing tenant boundary, add an organization/billing layer, and introduce territories as reusable scopes. Existing customers must continue working without migration downtime.

## Immediate Geloso pilot decision

Create one supplier company named **Geloso Beverage Group USA**. Do not create `Geloso NC` as a separate company unless Geloso confirms that North Carolina is independently administered and billed.

For the initial pilot:

- onboard the North Carolina representative into Geloso Beverage Group USA;
- identify the user operationally as covering North Carolina;
- invite the representative's manager into the same company later;
- connect Geloso Beverage Group USA to Healy Wholesale;
- treat the current `salesRouteNum` or an interim profile label as temporary territory metadata;
- do not make a permanent pricing decision based on this one-user pilot.

This gets the customer live without establishing a state-per-company structure that would be expensive to reverse.

## Problem transformed into opportunity

### Current problem

The current schema cannot cleanly represent all of these facts simultaneously:

- Geloso is one commercial customer.
- A national leader should see every territory.
- A regional manager may oversee several states.
- A representative may cover one state or a custom market.
- The same distributor may operate in multiple territories.
- Geloso may connect with hundreds of independent distributor companies.
- Billing should not be duplicated for every territory.

If every territory becomes a company, Displaygram creates data silos. If every user and connection stays flat inside one company, the dashboard becomes noisy and permissions become difficult to understand.

### Product opportunity

Territory-aware organizations turn Displaygram from a local-team tool into a supplier network platform. This creates sellable capabilities:

- national and regional scorecards;
- territory-specific feeds, goals, alerts, and reports;
- distributor coverage maps;
- regional manager workflows;
- portfolio performance across independent distributors;
- enterprise billing based on internal seats and network reach;
- cleaner onboarding for suppliers with large distributor networks.

The territory layer should therefore be treated as an enterprise capability, not merely a workaround for Geloso.

## Design principles

1. **One commercial customer should normally have one billing owner.**
2. **Territories are scopes, not separate companies.**
3. **Distributor companies remain independent tenants connected to suppliers.**
4. **Existing `companyId` behavior must remain valid during migration.**
5. **National access must not require storing hundreds of territory IDs on every user.**
6. **Filtering and security are separate concerns.** A filter changes what is convenient to view; authorization determines what a user is permitted to read.
7. **Denormalized scope fields are acceptable on posts and goals** when they make Firestore queries predictable, provided the canonical source remains identifiable.
8. **All migrations should be additive, dual-read, and reversible until verified.**

## Proposed domain model

### Organization

An organization is the commercial customer, parent identity, and billing owner.

```text
organizations/{organizationId}
  name: "Geloso Beverage Group USA"
  organizationType: "supplier"
  status: "pilot" | "active" | "suspended"
  billingCompanyId: string
  defaultCompanyId: string
  createdAt
  updatedAt
```

For most existing customers, one organization maps to one company. This keeps the model inexpensive for small customers while allowing enterprise customers to grow into multiple operational companies later.

### Company

`companies/{companyId}` remains the primary operational tenant and current security boundary.

Add optional fields:

```text
organizationId: string
parentCompanyId: string | null
companyScope: "primary" | "subsidiary" | "operating-unit"
territoriesEnabled: boolean
```

For the Geloso pilot, Geloso Beverage Group USA is the primary company and billing company. No subsidiary is needed for North Carolina.

### Territory

Use a top-level collection to make company and organization queries straightforward.

```text
territories/{territoryId}
  organizationId: string
  companyId: string
  name: "North Carolina"
  code: "NC"
  territoryType: "state" | "region" | "market" | "custom"
  parentTerritoryId: string | null
  stateCodes: ["NC"]
  status: "active" | "archived"
  managerUserIds: string[]
  createdAt
  updatedAt
```

`parentTerritoryId` allows a hierarchy such as USA → Southeast → North Carolina without turning territories into companies.

Keep `managerUserIds` small. Do not store all representatives or accounts as growing arrays on the territory document.

### Territory membership

Use deterministic membership documents for many-to-many user assignments.

```text
territoryMemberships/{territoryId}_{userId}
  organizationId: string
  companyId: string
  territoryId: string
  userId: string
  membershipRole: "manager" | "representative" | "viewer"
  status: "active" | "inactive"
  createdAt
  updatedAt
```

Add small convenience fields to `users/{uid}`:

```text
primaryTerritoryId: string | null
territoryAccess: "assigned" | "all-company" | "all-organization"
territoryIds: string[] // optional bounded cache, not canonical membership
```

National administrators use `all-organization`; they should not receive an array containing hundreds of territories.

### Accounts

Accounts currently use `salesRouteNums`. Preserve that during migration and add:

```text
territoryIds: string[]
primaryTerritoryId: string | null
```

An account may belong to multiple territories when coverage overlaps. Territory assignment should eventually become canonical; route numbers remain an integration/legacy identifier.

### Posts

New posts should snapshot their scope at creation:

```text
organizationId: string
territoryIds: string[]
primaryTerritoryId: string | null
```

Continue storing `companyId`. Territory metadata must not replace company ownership.

For historical posts, territory can be inferred from the associated account when possible. Posts that cannot be resolved should remain visible at company scope and be marked for review rather than hidden.

### Goals and goal-account reports

Add territory scope to company goals, supplier goals, Gallo goals, and goal-account reports:

```text
scopeType: "company" | "territory" | "users" | "accounts"
territoryIds: string[]
```

A national goal may target all territories. A regional goal may target Southeast. Existing user/account assignment behavior remains valid and takes precedence where explicitly configured.

### Company connections

Keep one connection between two companies. Do not create one connection per territory.

Add optional coverage metadata:

```text
coverageMode: "all" | "selected-territories"
supplierTerritoryIds: string[]
distributorTerritoryLabels: string[]
relationshipOwnerUserIds: string[]
```

This allows Geloso to have one Healy connection while identifying North Carolina coverage. A national supplier with 400 distributors would have roughly 400 company connections—not 400 Geloso companies.

## Parent-company dashboard and filtering UX

Fable 5 should design a persistent **Scope Selector** rather than adding territory controls separately to every screen.

Suggested hierarchy:

```text
Geloso Beverage Group USA
  All territories
  Southeast
    North Carolina
    South Carolina
  Northeast
    ...
```

The selected scope should influence:

- Activity Feed
- goals and goal analytics
- account feedback
- users and teams
- connected distributors
- notifications and digests
- reports and exports

Recommended behavior:

- national administrators default to `All territories`;
- regional managers default to their primary region;
- representatives default to their primary territory;
- users may only select scopes they are authorized to access;
- the active scope remains visible in the page header;
- filters operate within the active scope rather than silently replacing it;
- URLs should preserve the selected scope for shareable admin views where safe.

Avoid showing a flat list of hundreds of territories or distributors. Use search, hierarchy, recent scopes, and saved views.

## Authorization model

Territories must initially be classified as one of these modes:

1. **Filtering-only:** all users in a company can technically read company data, but the UI defaults to their assigned territory.
2. **Restricted:** users may only read documents assigned to authorized territories.

Recommendation: launch the pilot in filtering-only mode, clearly documenting that it is not a security boundary. Implement restricted territory access only after auditing every Firestore client query and rule path.

When restricted mode is introduced:

- never trust the territory selected by the client;
- derive authorization from the signed-in user's company and memberships;
- preserve admin `all-company` and `all-organization` access without huge arrays;
- update Cloud Functions that use `reportsTo`, company roles, goals, notifications, and exports;
- test users with multiple territories and users reassigned between territories;
- audit the existing authenticated Firestore catch-all before claiming territorial isolation.

The current catch-all rule makes stricter rules additive and may permit authenticated reads that narrower territory rules appear to deny. It must be removed or safely replaced before territory membership becomes a security promise.

## Firestore query and index implications

Likely indexes include combinations of:

- `companyId + territoryIds(array-contains) + displayDate`
- `organizationId + territoryIds(array-contains) + displayDate`
- `companyId + primaryTerritoryId + status`
- `organizationId + userId + status` on memberships
- `organizationId + territoryId + status` on memberships
- `companyId + territoryIds(array-contains) + createdAt` for goal feedback

Do not pre-create every possible filter combination. First define supported query shapes for each screen, then add only the indexes those shapes require. Complex multi-filter reporting may eventually belong in derived analytics documents rather than direct Firestore queries.

## Pricing redesign

The current pricing combines user limits and company-connection limits in one plan ladder. That works better for distributors than national suppliers. A supplier with few internal users but hundreds of distributor relationships does not fit the current Enterprise limit of 300 users and 40 connections.

Recommended pricing dimensions:

### Distributor plans

- active internal users;
- supplier connections;
- integrations and advanced goal features.

### Supplier plans

- active internal users;
- connected distributor band, for example 25 / 100 / 500 / custom;
- territory and hierarchy features;
- national analytics and exports;
- onboarding/support level.

### Enterprise organization billing

- one organization owns the subscription;
- territories do not create separate subscriptions;
- subsidiaries may be included or billed as operating units;
- custom contracts can override limits without hard-coded special plan IDs;
- usage counts should distinguish users, companies, territories, and active connections.

Do not immediately charge the Geloso pilot as if all 400 potential distributors are active. Use a defined pilot allowance, gather usage, and convert to a supplier-network plan when scope is understood.

## Migration strategy

### Phase 0 — Pilot without structural dependency

- Create Geloso Beverage Group USA as one supplier company.
- Add the NC representative and manager to that company.
- Connect Healy.
- Record North Carolina using temporary profile/route metadata.
- Validate the real reporting chain and distributor workflow.

### Phase 1 — Additive schema

- Create an organization for each existing company.
- Set `organizationId` on companies and users.
- Create a default territory such as `All company` or leave territory null until assigned.
- Add territory collections and management UI behind a feature flag.
- Do not remove `salesRouteNum` or `salesRouteNums`.

### Phase 2 — Dual read and dual write

- New accounts and posts receive territory fields.
- Existing screens understand both territory fields and legacy route fields.
- Account assignment updates both models where a safe mapping exists.
- Instrument unresolved mappings and query failures.

### Phase 3 — Backfill

- Preview proposed account, post, goal, and user assignments.
- Require an admin confirmation for ambiguous mappings.
- Write idempotent migration scripts with dry-run and commit modes.
- Record migration version and timestamps.

### Phase 4 — Territory UX and analytics

- Launch scope selector.
- Add regional dashboards and saved views.
- Update notifications and email digests to summarize by territory.
- Add distributor coverage reporting.

### Phase 5 — Optional restricted access

- Complete Firestore access audit.
- Replace the authenticated catch-all.
- Add territory-aware rules and emulator tests.
- Roll out restricted access company by company.

### Phase 6 — Pricing conversion

- Add supplier-specific plans and connection bands.
- Preserve existing subscriptions until customers opt in or contracts renew.
- Support explicit enterprise overrides.

## Fable 5 design handoff

Fable 5 should produce designs and a change inventory for:

1. Organization settings and territory management.
2. Create/edit territory flow with hierarchy and state selection.
3. User assignment to one or multiple territories.
4. National, regional-manager, and representative dashboard states.
5. Persistent scope selector for desktop and mobile.
6. Territory-aware Activity Feed filters.
7. Connected-distributor coverage view supporting hundreds of connections.
8. Territory-scoped goal creation and analytics.
9. Empty, loading, archived-territory, and reassignment states.
10. Supplier pricing cards and enterprise contact flow.
11. Pilot-to-paid upgrade experience.
12. Clear explanations distinguishing company, territory, distributor, and route.

Fable should avoid designing a state as a company, presenting 400 connections as an unsearchable card wall, or treating a UI filter as a security guarantee.

## Engineering change inventory

Before implementation, audit and estimate changes in:

- shared TypeScript company, user, account, post, goal, and connection types;
- company onboarding and invite acceptance;
- Teams and `reportsTo` management;
- account import and route assignment;
- post payload creation and historical post editing;
- Activity Feed and shared-feed query builders;
- goal creation, Gallo goals, and account-feedback workflows;
- notification routing and daily digests;
- company connections and brand approvals;
- billing limits, Braintree mapping, and company usage counts;
- developer dashboard company repair tools;
- Firestore rules, indexes, emulator tests, and migration scripts;
- offline/IndexedDB cache keys, which must include active scope.

## Open product decisions

These questions should be answered with Geloso before implementation:

1. Is Geloso Beverage Group USA the contractual customer and billing owner?
2. Are territories states, multi-state regions, distributor markets, or a mixture?
3. Can one representative belong to multiple territories?
4. Can one distributor connection cover multiple territories?
5. Should regional managers see all posts and accounts in their territories?
6. Is territory separation organizational convenience or confidential access control?
7. Who creates national goals, and can regional managers modify them?
8. How should distributor activity be attributed when boundaries overlap?
9. Does Geloso want all 400 distributors connected, or only active pilot partners?
10. Which metrics justify supplier pricing: active distributors, seats, territories, posts, or goals?

## Success criteria

The design is successful when:

- Geloso has one coherent national identity and billing account;
- the NC representative sees an appropriately focused experience;
- the manager can see NC and any other assigned territories;
- national leadership can aggregate all territories;
- Healy remains an independent connected distributor;
- adding the next state does not require another Geloso company;
- adding hundreds of distributors does not make navigation unusable;
- existing Displaygram companies continue working without territory setup;
- billing can represent a supplier network without artificial company duplication;
- future restricted access can be implemented without redesigning the domain model.

## Explicit non-goals for the first implementation

- replacing `companyId` as the tenant key;
- deleting route-number fields;
- making territories a security boundary before the rules audit;
- supporting arbitrary-depth corporate hierarchies on day one;
- automatically enrolling all Geloso distributors;
- changing existing customer subscriptions without migration and notice.
