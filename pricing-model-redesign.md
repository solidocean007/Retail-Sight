# Pricing Model Redesign — Two Plan Families

Status: **Locked** (decisions confirmed with Clinton 2026-08-21)
Implementation status: Not started — this doc is the plan of record
Companion doc: `supplier-territory-scaling-design.md` (its "Pricing redesign" section is superseded by this doc)

## Locked decisions

1. **Two plan families**, keyed off the existing `companyType: "distributor" | "supplier"` field. Distributor tiers scale by users; supplier tiers scale by connections.
2. **Connections count against both sides** (unchanged from today). This is deliberate: it is the upgrade engine. A supplier inviting distributors pushes them past the free tier; a distributor joining supplier networks pushes suppliers up the bands.
3. **No Braintree add-ons, no proration, discrete plan IDs only.** Every sellable tier = one Braintree plan ID. Existing locked billing rules in `billingHelpers.ts` stand unchanged (upgrade = cancel + create new subscription, downgrade at renewal, webhooks are source of truth).
4. **Capacity-only gating.** No new feature gates. Users/connections are the axes; existing Gallo + CSV-export gating stays as-is.
5. **Aggressively low pricing.** Strategy: undercut per-seat incumbents (iSellBeer, Lilypad, Repsly class — typically $20–50/user/mo, no public pricing) by staying well under 20% of their effective cost at every scale. Land-grab first, raise later if ever.
6. **Supplier free tier is a taste: exactly 1 connected distributor.** Their second distributor is the paywall moment, mirroring the distributor's third connection.
7. **Whales are custom plan docs, not hardcoded plan IDs.** The `healy_plan` pattern (special-cased ID in code) is deprecated for new deals — see "Custom contracts" below. Existing healy subscription is untouched.
8. **Existing customers are never migrated automatically.** Current plans simply become the distributor family. No subscription changes without notice/opt-in.

## Distributor plan family

| Plan | Price/mo | Users | Connections | Braintree plan ID |
|---|---|---|---|---|
| Free | $0 | 5 | 2 | (none — no subscription) |
| Starter | $19 | 25 | 5 | `starter` (exists) |
| Team | $39 | 50 | 10 | `team` (exists) |
| Pro | $99 | 150 | 25 | `pro` (exists) |
| Enterprise | $199 | 300 | 40 | `enterprise` (exists) |
| Max | $299 | 1,000 | 60 | `dist_max` (NEW) |

## Supplier plan family

| Plan | Price/mo | Users | Connections | Braintree plan ID |
|---|---|---|---|---|
| Supplier Free | $0 | 5 | **1** | (none — no subscription) |
| Supplier Starter | $29 | 15 | 10 | `supplier_starter` (NEW) |
| Supplier Growth | $79 | 50 | 50 | `supplier_growth` (NEW) |
| Supplier Network | $149 | 100 | 150 | `supplier_network` (NEW) |
| Supplier National | $299 | 150 | 500 | `supplier_national` (NEW) |

## Custom contracts (whales)

Target prices: monster distributor (500–1,000+ users) **$400–500/mo**; national supplier (300–500+ distributors, future territory features) **$500–750/mo**.

Mechanism — replaces the hardcoded `healy_plan` pattern:

- One Braintree plan ID: `custom_contract`, created at a placeholder price. Braintree allows a **price override at subscription creation** (`gateway.subscription.create({ ..., price: "500.00" })`), so one plan ID serves every custom deal.
- Each contract gets its own doc in the `plans` collection (e.g. `plans/custom_geloso`) holding `braintreePlanId: "custom_contract"`, the negotiated `price`, `userLimit`, `connectionLimit`, and `selfServe: false`.
- `syncBillingFromSubscription` currently looks up plans by `braintreePlanId` with `.limit(1)` — custom contracts break that assumption (many docs share `custom_contract`). The sync must fall back to the company's assigned plan doc id (store `billing.planDocId` on the company when a custom subscription is created).
- `healy_plan` remains valid in code until that customer is migrated or renews onto a custom contract. Do not delete it.

## Firestore schema changes

`plans/{planId}` — add to every doc:

```text
family: "distributor" | "supplier"      // which pricing table shows it
selfServe: boolean                       // false for custom contracts
sortOrder: number                        // display order
active: boolean                          // retirable without deleting history
```

New docs: `dist_max`, `supplier_starter`, `supplier_growth`, `supplier_network`, `supplier_national`, plus per-contract custom docs. A seed/verification script should assert every `selfServe` plan's `braintreePlanId` exists in Braintree (sandbox and production).

`companies/{companyId}` — no structural change. Free-tier defaults at company creation become family-aware: distributor free = 5 users / 2 connections; supplier free = 5 users / **1 connection**. Find where `limits.userLimit` / `limits.connectionLimit` defaults are written on company creation (`createCompanyOrRequest.ts` path) and branch on `companyType`. Existing supplier companies on free keep their current 2-connection limit (no clawback).

Optionally add `billing.planDocId: string` (see custom contracts).

## Code touchpoints (inventory, not yet implemented)

- `functions/src/billing/billingHandlers/callables.ts` — `validPlanIds` arrays are hardcoded in `createSubscription`, `changePlanAndRestartBillingCycle`, `scheduleBillingDowngrade`. Replace with a lookup of `plans` where `selfServe == true` (plus `custom_contract` via an admin-only path). Note: front-end `PlanName` type is currently missing `starter` — fix during the same pass.
- `functions/src/billing/billingHelpers.ts` — plan lookup change for custom contracts (above). Enforcement (`enforePlanLimitsInternal.ts`) already reads limits dynamically from `plans` + `companies.counts`, so **no enforcement changes are required** for new tiers. This is the main reason the rollout is low-risk.
- `front-end/src/utils/types.ts` — `PlanName` union, `PlanType` gains `family`/`selfServe`/`sortOrder`/`active`.
- `front-end/src/utils/getPlanDetails.ts` and the billing/upgrade UI — render the family matching `companyType`; two public pricing tables.
- Upgrade-prompt UX at the two paywall moments: distributor's 3rd connection, supplier's 2nd distributor (the `enforcePlanLimitsInternal` "Connection limit reached" error should route to the family-correct upgrade screen, not a generic message).
- `firestore.rules` — `plans` should be world/authenticated-readable but writable only by admin tooling; verify current rules don't rely on the temporary catch-all for `plans` reads before tightening anything.
- `pricing_plans.md` — rewrite once implemented (it documents the live single ladder today; leave it accurate until then).

## Braintree control-panel work (Clinton, manual)

In **sandbox first**, then production, create monthly recurring plans, no trial period, no add-ons:

1. `dist_max` — $299.00
2. `supplier_starter` — $29.00
3. `supplier_growth` — $79.00
4. `supplier_network` — $149.00
5. `supplier_national` — $299.00
6. `custom_contract` — $1.00 placeholder (price is overridden per subscription)

Existing `starter`, `team`, `pro`, `enterprise`, `healy_plan`, `test` are untouched. Verify each new plan ID string matches the Firestore `plans` doc's `braintreePlanId` exactly — the webhook sync matches on that string.

## Income scenarios (draft ladder, illustrative)

- Worst case (slow organic, ~20 paying distributors, 2 supplier starters): ≈ $450/mo.
- Middle case (~100 paying distributors, 10 mid-tier suppliers): ≈ $4,800/mo (~$58K/yr).
- Best case (3 custom national suppliers, 20 mid-tier suppliers, ~500 paying distributors): ≈ $22K/mo (~$265K/yr).

In every scenario most revenue is distributor upgrades *caused by* supplier network growth — suppliers are the sales force. Keep supplier prices low; they multiply.

## Rollout order

1. **Docs** (this file) — done.
2. **Braintree sandbox plans** — manual, no code risk.
3. **`plans` collection seeding + types** — additive, invisible to current UI.
4. **Functions: dynamic `validPlanIds` + custom-contract sync** — the only behavior-bearing backend change; test in emulator + sandbox with the `test` plan before deploy.
5. **Pricing UI: two families + paywall routing** — front-end only.
6. **Production Braintree plans + publish new pricing page.**
7. **Custom-contract admin tooling** (developer dashboard) — can trail everything else.

## Open questions (not blocking)

- Annual billing (e.g. 2 months free)? Currently monthly-only; Braintree supports 12-month cycles as separate plan IDs — would double the catalog, so defer.
- When territory features ship (see companion doc), do they stay capacity-gated per decision #4, or become the reason a supplier picks National? Revisit at that time.
- Grandfathering message for existing supplier-type companies on the old ladder, if any ever want to switch families mid-subscription (expected path: cancel + resubscribe, same as any plan change).
