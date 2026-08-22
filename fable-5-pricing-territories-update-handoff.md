# Fable 5 Update Handoff — Pricing Families and Supplier Territories

Date: 2026-08-22  
Status: Product direction approved; catalog groundwork complete; billing behavior not ready for production

## Purpose

Displaygram is expanding from a single-company distributor product into a platform that can support national suppliers, their territory teams, and hundreds of independent distributor connections.

The first real use case is Geloso Beverage Group USA. Geloso should normally be represented as one supplier company with North Carolina as a territory—not as a separate `Geloso NC` company. Territories should organize users, goals, posts, accounts, reporting, and distributor coverage without creating separate subscriptions or fragmented company data.

## Locked product decisions

- There are two pricing families, selected by the existing company type: `distributor` or `supplier`.
- Distributor tiers primarily scale by users; supplier tiers primarily scale by connected distributors.
- A connection counts toward both connected companies. This is intentional, and the low pricing is designed to offset the friction of both sides paying as their networks grow.
- Territories belong inside a supplier organization. They are not separate companies or separate subscriptions.
- Existing customers are not automatically migrated or repriced.
- Plans are capacity-based. Do not introduce new feature gates during this pricing change.
- Supplier Free permits five users and one distributor connection. The second connection is the supplier upgrade moment.
- Distributor Free permits five users and two connections. The third connection is the distributor upgrade moment.
- Custom enterprise contracts use company-specific Firestore plan documents backed by one Braintree `custom_contract` plan with a subscription price override.
- Existing `healy_plan` behavior must remain intact until explicitly migrated.

## Current implementation status

### Complete

- The full pricing plan is documented in `pricing-model-redesign.md`.
- The organization and territory proposal is documented in `supplier-territory-scaling-design.md`.
- Branch `feat/plans-catalog-seed` was committed as `e2e5e3d` and integrated into `main`.
- Firestore contains the new distributor and supplier plan catalog entries.
- The catalog seed script is dry-run-first, idempotent, and now reports zero pending writes.
- Shared front-end plan types include the new plan IDs and catalog metadata.

### In progress; do not deploy yet

Branch `feat/billing-dynamic-plan-ids`, commit `0e091f4`, contains the first implementation of:

- dynamic plan ID loading;
- custom-contract subscription price overrides;
- `billing.planDocId` synchronization for plans that share the `custom_contract` Braintree ID.

This branch is intentionally being held from production pending server-side authorization corrections and complete billing validation.

### Manual setup still required

Update 2026-08-22: Clinton has already created all six plans in **production** (sandbox intentionally skipped; plans are inert until the billing branch deploys). Creating the same plan IDs in sandbox is still recommended so end-to-end billing tests don't require real charges. The list:

- `dist_max` — $299/month
- `supplier_starter` — $29/month
- `supplier_growth` — $79/month
- `supplier_network` — $149/month
- `supplier_national` — $299/month
- `custom_contract` — $1 placeholder, overridden during subscription creation

## Important engineering blockers

The current dynamic-plan implementation must not be shipped as written:

1. Server validation currently builds one global list of sellable plan IDs. It must require the selected plan's `family` to match the company's `companyType`.
2. New purchases and plan changes must require both `selfServe === true` and `active === true`.
3. Legacy IDs such as `test` and `healy_plan` must not become generally purchasable through a direct callable request.
4. A custom contract must belong to the requesting company and must remain inaccessible through the normal self-service path.
5. Firestore plan documents cannot be trusted for billing authorization while authenticated clients can modify them. The existing broad catch-all rule is additive and may defeat a narrower `plans` rule. Rules must be verified or corrected before custom contracts are deployed.
6. Existing supplier customers on distributor-family plans need a deliberate grandfathering path. No automatic migration is allowed.

Required test cases include cross-family rejection, inactive-plan rejection, wrong-company custom-contract rejection, free-tier handling, legacy Healy continuity, webhook synchronization, upgrade behavior, and scheduled downgrade behavior.

### Blocker resolution status (2026-08-22, commit `695a6c7` on `feat/billing-dynamic-plan-ids`)

1. **Family match — RESOLVED.** `assertPlanPurchasable` in `callables.ts` requires the plan's `family` to equal the company's `companyType` for every purchase, plan change, and scheduled downgrade.
2. **selfServe + active — RESOLVED.** The sellable catalog includes only `selfServe == true` docs, and `active === false` plans are rejected with a distinct error.
3. **Legacy IDs — RESOLVED.** `test`, `healy_plan`, and `custom_contract` are never generally purchasable. The legacy fallback (used only if the catalog is unreadable) is trimmed to `starter/team/pro/enterprise`. A continuity exception lets a company resubscribe to the exact plan it is already on — this is the grandfathering mechanism for Healy and for supplier companies on distributor plans.
4. **Custom-contract ownership — RESOLVED** (was already in `0e091f4`). The contract doc must carry the requesting `companyId`, be active, and have a positive price; `custom_contract` is excluded from the self-service catalog by construction.
5. **Firestore rules — RESOLVED in code, needs deploy + emulator verification.** The temporary catch-all now excludes `plans`, so the explicit plans rule (read authenticated, write developer-only) is enforced. Verified the front-end has no direct `plans` reads/writes (it uses the `getPlanDetails` callable). The full catch-all removal remains a Phase 5 item.
6. **Grandfathering — RESOLVED by policy.** No automatic migration; existing plans keep working via the continuity exception; a cross-family company changing plans chooses from its own family's catalog from then on.

The test list above remains the acceptance gate: none of these have been exercised against Braintree yet.

## What Fable 5 should design now

Fable should focus on the customer-facing information architecture and interaction states. Engineering will separately secure billing and Firestore behavior.

### 1. Two-family pricing experience

Design:

- distributor and supplier pricing tables;
- company-type-aware plan recommendations;
- clear connection-limit language explaining that each company manages and pays for its own network capacity;
- upgrade prompts for the distributor's third connection and supplier's second connection;
- current-plan, grandfathered-plan, inactive-plan, scheduled-downgrade, and custom-contract states;
- an enterprise contact path that does not expose custom contracts as self-service plans;
- desktop and mobile layouts.

Avoid implying that one side pays on behalf of the other. Suggested concept: **Each organization pays for the team and partner network it manages in Displaygram.**

### 2. Supplier organization and territory experience

Design Geloso as one company named **Geloso Beverage Group USA**, initially with a North Carolina territory. Include:

- organization settings;
- territory creation and editing;
- nested region/state/market hierarchy;
- assigning representatives, managers, and viewers to territories;
- national, regional-manager, and representative dashboard states;
- a persistent scope selector for desktop and mobile;
- search, recent scopes, and saved views for large organizations;
- territory-aware Activity Feed, goals, accounts, feedback, notifications, reports, and exports;
- connected-distributor coverage that remains usable with approximately 400 connections;
- empty, loading, archived-territory, overlapping-coverage, and reassignment states.

### 3. Language hierarchy

The interface must clearly distinguish:

- **Organization:** the commercial customer and billing owner.
- **Company:** the existing operational tenant and data owner.
- **Territory:** an internal geographic or organizational scope.
- **Connected distributor:** an independent partner company.
- **Route:** legacy or integration metadata, not a territory synonym.

Do not design a state as its own company, show hundreds of distributors as an unsearchable card wall, or imply that selecting a territory filter changes security permissions.

## Recommended Fable deliverables

1. Updated information architecture and navigation map.
2. Desktop and mobile pricing flows for both company families.
3. Upgrade-limit and enterprise-contact flows.
4. Organization settings and territory-management screens.
5. Persistent scope selector and its responsive behavior.
6. Role-specific dashboard examples for national admins, regional managers, and representatives.
7. Large-network connected-distributor search and coverage view.
8. Territory-aware goal creation and analytics concepts.
9. A state matrix covering permissions, loading, empty, archived, reassigned, grandfathered, and custom-contract cases.
10. A component/change inventory for engineering handoff.

## Boundaries for this design pass

- Preserve `companyId` as the current tenant key.
- Do not make territories separate subscriptions.
- Do not promise territory-level confidentiality yet; the initial pilot is filtering and workflow scope only.
- Do not remove route fields or redesign existing subscriptions.
- Do not automatically enroll all Geloso distributors.
- Do not design new feature gates beyond existing Gallo and export restrictions.

## Immediate sequence after design

1. Engineering fixes and validates `feat/billing-dynamic-plan-ids`.
2. Clinton creates the new Braintree plans in sandbox.
3. Billing is tested end to end without changing existing customers.
4. The family-aware pricing and upgrade UI is implemented from Fable's designs.
5. Geloso is onboarded as one supplier company for the NC pilot.
6. Territory schema and scope UX are introduced additively behind a feature flag.
7. Firestore access is audited before territories are ever presented as a security boundary.

## Source documents

- `pricing-model-redesign.md` — pricing plan of record.
- `supplier-territory-scaling-design.md` — organization, territory, migration, and scaling proposal.

