# Billing Family Filtering and Billing Experience Redesign

Status: implementation and design handoff  
Target branch: `feat/billing-dynamic-plan-ids`  
Prepared: 2026-08-22

This document contains two copy-ready prompts:

1. a Claude engineering prompt to correct plan visibility and implement the redesigned billing experience safely;
2. a Fable 5 prompt to design the experience at production quality.

The application is already in use. Preserve existing subscriptions, Healy continuity, checkout behavior, scheduled downgrades, webhook synchronization, and Firestore integrity.

---

## Confirmed problem

Healy is a distributor company, but its authenticated Billing page currently displays every document in the `plans` collection, including supplier and internal plans.

The cause is in:

`front-end/src/components/Pages/Billing/BillingDashboard.tsx`

The current code loads the entire `plans` collection and contains a Healy-specific exception:

```ts
const visiblePlans =
  currentCompanyId === "3WOAwgj3l3bnvHqE4IV3"
    ? planList
    : planList.filter((p) => p.braintreePlanId !== "healy_plan");
```

This behavior is incorrect. Healy should see its grandfathered `healy_plan` in the **current-plan summary**, but the selectable catalog must contain only active, self-serve distributor plans. Healy must not see supplier, test, internal, inactive, or other companies' custom-contract plans.

The backend in commits `0e091f4` and `695a6c7` already rejects purchases that are inactive, not self-serve, or from the wrong family. The frontend must now match that policy without weakening the server checks.

### Required catalog policy

For any authenticated company:

- derive the plan family from `companies/{companyId}.companyType`;
- `companyType: "distributor"` sees only distributor-family self-serve plans;
- `companyType: "supplier"` sees only supplier-family self-serve plans;
- selectable plans require `active === true` and `selfServe === true`;
- sort selectable plans by `sortOrder`, not incidental Firestore order or price;
- never use a hard-coded company ID to decide catalog visibility;
- never offer `healy_plan`, `test`, `custom_contract`, inactive plans, or another company's custom contract;
- keep the exact current plan visible in the account summary even when it is legacy, inactive, non-self-serve, or grandfathered across families;
- fail closed if the company type is missing or unsupported: show a useful recovery message and no purchasable plans.

### Plan identity warning

Do not continue assuming the Firestore plan document ID and `braintreePlanId` are always interchangeable. Preserve `doc.id` when reading a plan. In particular, free-family records may not have a paid Braintree plan ID, while custom contracts can share `custom_contract` as their Braintree ID.

Use explicit names such as:

- `planDocId` or `catalogPlanId` for the Firestore document;
- `braintreePlanId` for the payment-provider identifier.

Audit every selection, React key, current-plan lookup, checkout payload, upgrade request, and downgrade request before changing identity handling. Do not send an empty or incorrect Braintree plan ID.

### Firestore integrity warning

The current client calls `getDocs(collection(db, "plans"))`. The current `/plans` rule allows any authenticated user to list and read entire plan documents. A UI filter alone does not prevent internal or company-specific pricing from being downloaded and inspected.

Claude must assess and document the safest path. The preferred long-term boundary is a server-owned callable that returns a sanitized catalog for the caller's company plus the caller's current-plan summary. An alternative must still prevent unrelated custom-contract documents from being exposed. Do not tighten Firestore rules blindly; first inspect all current plan readers and use emulator tests so production billing is not broken.

---

## Copy-ready Claude engineering prompt

```text
You are working in the Displaygram repository on branch `feat/billing-dynamic-plan-ids`. This is a production application with existing paid and grandfathered customers. Inspect the repository and current branch before editing. Preserve all unrelated user changes.

Your job has two connected parts:

1. Fix the authenticated Billing page so every company sees only the purchasable plan family appropriate to its `companyType`.
2. Redesign and implement the Billing experience as a modern, low-friction, responsive, accessible B2B SaaS experience, using the Fable 5 design output when supplied and the product direction below when it is not.

CONFIRMED BUG

`front-end/src/components/Pages/Billing/BillingDashboard.tsx` loads the entire `plans` collection. It contains a hard-coded Healy company-ID exception that returns all plans. Healy is a distributor and currently sees distributor, supplier, internal, test, and other catalog entries.

Remove this company-specific visibility behavior. Do not solve it by adding another company ID or a hard-coded plan allowlist.

BUSINESS RULES

- The company's `companyType` is the source for family selection: `distributor` or `supplier`.
- Selectable catalog plans must match that family and have `selfServe === true` and `active === true`.
- Sort by `sortOrder` with a deterministic fallback.
- `healy_plan`, `test`, `custom_contract`, inactive plans, and company-specific custom plans are never general catalog choices.
- Healy must retain its existing `healy_plan`. Display it in the current-plan summary, including current limits/status where available, but never offer it as a selectable plan.
- A grandfathered or inactive current plan remains visible as the current plan. Available changes come only from the company's present family.
- If `companyType` is missing or invalid, fail closed: do not show a mixed catalog. Present a concise support/retry state.
- The backend's `assertPlanPurchasable` checks in `functions/src/billing/billingHandlers/callables.ts` remain authoritative. Do not remove or weaken family, active, selfServe, ownership, or continuity checks.
- Preserve existing Braintree behavior: upgrades start immediately through the existing callable; paid downgrades are scheduled for renewal; free cancellation behavior must remain accurate; existing payment method and webhook flows must not regress.

PLAN IDENTITY

Retain the Firestore document ID when loading plans. Do not treat it as synonymous with `braintreePlanId`. Audit free plans, custom contracts, React keys, current-plan matching, checkout, upgrade, and downgrade payloads. Use explicit `planDocId`/`catalogPlanId` and `braintreePlanId` naming. Do not send an empty ID to a billing callable. If the supplier-free downgrade path is incomplete, identify it explicitly and either complete it safely with tests or keep it out of the release rather than masking the problem.

DATA ACCESS AND FIRESTORE RULES

The current client downloads every `plans` document, and `/plans` permits authenticated reads. A client-side filter is not confidentiality. Inspect all readers of `plans`, the current rules, callable exports, plan seed data, and custom-contract format.

Prefer a server-owned callable such as `getAvailableBillingPlans` that:

- derives company identity from authenticated membership/authorization, not a client-trusted company type;
- returns only sanitized active self-serve plans matching the company's family;
- returns the authorized company's current plan summary separately so legacy/custom continuity can render;
- never returns another company's custom-contract metadata or negotiated price;
- returns stable plan document identity and payment identity as separate fields;
- rejects access to a company the caller cannot manage.

If that boundary is too large for this change, implement the smallest safe release fix, clearly record the residual read-exposure risk, and propose a separate rules/callable migration. Do not claim client filtering provides security. Do not break existing plan reads by tightening rules without an inventory and emulator coverage.

IMPLEMENTATION QUALITY

- Extract catalog selection and ordering into a small, typed, testable function instead of burying it in JSX.
- Eliminate `as any` in the touched billing path where practical.
- Use a clear loading state, recoverable error state, and empty-catalog state.
- Avoid repeated current-plan scans and duplicated price comparisons; derive stable values with typed selectors/memos.
- Use Firestore catalog descriptions and metadata where appropriate. Centralize presentation fallback copy instead of scattering plan-name switches.
- Do not introduce a distributor/supplier switch on the authenticated Billing page. The company type determines the catalog.
- Preserve the app shell and shared design tokens. Do not redesign unrelated screens.
- Keep responsive behavior strong at approximately 390px, 768px, 1024px, and 1440px.
- Meet keyboard, focus, contrast, semantic-heading, reduced-motion, and screen-reader requirements.

EXPERIENCE GOALS

The page should feel premium, modern, AI-native, spacious, calm, and data-driven—not like a generic grid of pricing cards. Use strong information hierarchy, generous whitespace, crisp geometry, restrained depth, subtle atmospheric/radial light, and purposeful micro-interactions. Avoid noisy gradients, excessive glass effects, tiny low-contrast text, decorative charts with no meaning, emoji as primary UI, and a wall of repeated cards.

Lead with the customer's situation:

- current plan and billing status;
- current usage versus user and connection capacity;
- renewal or scheduled-change status;
- the clearest next action;
- a recommended next plan only when it is defensible from actual capacity data.

Reduce choice overload. Consider showing the current plan plus one recommended next step first, with a compact “Compare all distributor plans” or “Compare all supplier plans” disclosure/table. If all plans are shown, make comparison effortless and keep every card concise.

Use family-correct language:

- distributor plans emphasize team seats and connected suppliers;
- supplier plans emphasize team seats and connected distributors.

Do not invent feature gates or ROI claims. Plans are capacity-based. Communicate value through headroom, network growth, collaboration scale, operational continuity, transparent pricing, and low-friction changes. Prefer short, specific copy over marketing paragraphs.

REQUIRED STATES

Implement or verify:

1. Healy on `healy_plan`: legacy current-plan summary plus distributor choices only.
2. Standard distributor on free and paid plans.
3. Supplier on supplier-free and paid supplier plans.
4. Grandfathered cross-family current plan: current plan visible, new choices from current company family only.
5. Current inactive/non-self-serve plan: summary visible, not offered in catalog.
6. Near-limit and at-limit usage.
7. Active subscription, past due, canceled, and free states.
8. Scheduled downgrade with effective date and disabled/conflict-safe actions.
9. Loading, catalog failure, missing company type, empty catalog, checkout processing, success, and failure.
10. Desktop, tablet, and mobile layouts.

ACCEPTANCE TESTS

- Healy never sees supplier plans or internal/test/custom plans.
- A distributor sees only `family === "distributor"`, `selfServe === true`, `active === true` choices.
- A supplier sees only `family === "supplier"`, `selfServe === true`, `active === true` choices.
- The exact current legacy/custom/inactive plan can render without entering the purchasable catalog.
- Missing company type exposes no purchasable plans.
- Plans are ordered by `sortOrder`.
- Direct callable attempts for the wrong family, inactive plans, internal plans, and another company's contract remain rejected.
- Existing Healy subscription behavior, webhooks, upgrades, scheduled downgrades, checkout, and payment updates still work.
- No unrelated plan documents or negotiated contract prices are returned by any new catalog endpoint.
- Add focused unit tests for catalog derivation and appropriate callable/rules emulator tests.
- Run relevant frontend typecheck/tests/build and functions lint/tests/build. Report exact commands and results.

DELIVERABLES

1. Implemented code and styles.
2. Focused tests.
3. A concise change summary explaining root cause and behavior by company type.
4. A Firestore/rules integrity note covering what clients can read before and after.
5. A list of significant files changed.
6. Screenshots or rendered verification for Healy distributor, ordinary distributor, supplier, and mobile states.
7. Any unresolved risk clearly labeled as blocking or follow-up.

Do not deploy, push, rewrite history, alter production Firestore data, or change Braintree plans unless explicitly authorized.
```

---

## Copy-ready Fable 5 master prompt

```text
Design a world-class authenticated Billing & Plans experience for Displaygram, a B2B platform connecting beverage suppliers and independent distributors. This is not a public marketing pricing page. It is the in-product control center where a company understands its plan, current network capacity, billing status, and safest next action.

I want production-ready product design—not a generic SaaS pricing-card template. Make it feel unmistakably modern, AI-native, spacious, intelligent, calm, premium, and data-driven. Think precision software for a living commercial network: subtle depth, crisp geometry, restrained atmospheric light, excellent typography, generous whitespace, strong numerical hierarchy, and purposeful motion. It may feel slightly “spacey,” but it must remain trustworthy financial software. Avoid visual gimmicks, neon overload, excessive glassmorphism, gratuitous gradients, busy dashboards, decorative charts, crowded cards, long marketing paragraphs, and tiny low-contrast text.

PRODUCT MODEL

Every company has exactly one pricing family determined by its existing company type:

- Distributor companies buy distributor plans. Their primary capacity story is internal users plus connected suppliers.
- Supplier companies buy supplier plans. Their primary capacity story is internal users plus connected distributors.

Never put a distributor/supplier toggle on this authenticated screen. Users cannot shop the wrong family.

Distributor plans:

- Free — $0/month — 5 users — 2 supplier connections
- Starter — $19/month — 25 users — 5 supplier connections
- Team — $39/month — 50 users — 10 supplier connections
- Pro — $99/month — 150 users — 25 supplier connections
- Enterprise — $199/month — 300 users — 40 supplier connections
- Max — $299/month — 1,000 users — 60 supplier connections

Supplier plans:

- Supplier Free — $0/month — 5 users — 1 distributor connection
- Supplier Starter — $29/month — 15 users — 10 distributor connections
- Supplier Growth — $79/month — 50 users — 50 distributor connections
- Supplier Network — $149/month — 100 users — 150 distributor connections
- Supplier National — $299/month — 150 users — 500 distributor connections

Plans are capacity-based. Do not invent feature locks. Existing specialized integrations may remain elsewhere, but this redesign must sell the practical value of headroom: more teammates collaborating, more supplier/distributor relationships, and room for the network to grow.

LEGACY HEALY SCENARIO

Healy is a distributor company on a grandfathered private plan named “Healy.” It must see that plan as its current plan, with its real price, status, usage, and limits where available. It must never see the Healy plan as a generally selectable product. Its available changes are active self-serve distributor plans only. It must never see supplier, test, internal, inactive, or another company's contract plans.

CORE DESIGN PRINCIPLE

Do not lead with six equal cards. Lead with clarity and relevance:

1. “Where am I now?”
2. “How much capacity am I using?”
3. “What happens next?”
4. “Which plan is the right next step, and why?”
5. “What will this change cost and when will it take effect?”

Recommended page hierarchy:

1. A compact page header: “Billing & capacity,” company identity, family label such as “Distributor workspace,” and a quiet route back to the dashboard.
2. A high-quality current-plan command card showing plan name, status, price, renewal date, payment health, and any pending change.
3. Two meaningful capacity visuals—team seats and connected partners—with used/limit numbers, percentage/headroom, and calm near-limit/at-limit states. These are real data visuals, not decoration.
4. A single, confident next-best-action module. Recommend the smallest plan that safely fits current usage with useful growth headroom. Explain the recommendation in one short sentence based on actual numbers. If no recommendation is defensible, do not fake one.
5. A compact “Compare plans” experience using progressive disclosure. Explore a clean comparison rail or table that makes price, users, connections, current status, and upgrade/downgrade direction instantly scannable. Avoid a repetitive wall of identical cards.
6. A minimal billing-behavior note: upgrades begin immediately; downgrades take effect at renewal; secure payments are handled by Braintree. Keep this concise and contextual.

VALUE COMMUNICATION

Show value without paragraphs or hype. Use short, credible microcopy such as:

- “Room for 18 more teammates”
- “2 supplier connections remaining”
- “Best fit for your current network”
- “Adds 100 seats and 15 partner connections”
- “Upgrade takes effect today”
- “Downgrade scheduled for Sep 18”

Do not claim money saved, time saved, or ROI unless the application has real data to support it. Do not use “AI-powered” as empty copy. Make the interface itself feel intelligent through prioritization, relevance, and data-aware recommendations.

INTERACTION AND FRICTION REDUCTION

- Keep the primary CTA obvious and singular in each section.
- Clearly distinguish current, recommended, upgrade, and downgrade states without relying only on color.
- When comparing a new plan, show the delta from the current plan: monthly price change, added/removed users, added/removed connections, and effective timing.
- Upgrades should feel immediate and confident.
- Downgrades must explain the renewal timing and any capacity conflict before confirmation.
- If current usage exceeds a lower plan's limits, make that plan unavailable and say why in one concise line.
- A pending downgrade should be prominent but calm, with its effective date and clear rules for changing/canceling it.
- Past-due payment should elevate “Update payment method” above plan shopping.
- Checkout should preserve context: selected plan, capacity delta, exact monthly amount, effective timing, secure payment, processing, success, and recoverable errors.
- On mobile, preserve the decision hierarchy. Do not shrink a desktop comparison table into unreadable cards.

VISUAL DIRECTION

- Premium B2B SaaS with an AI/data-platform character.
- Spacious composition with a disciplined grid and strong alignment.
- Neutral or deep-space foundation with a restrained cool accent, subtle radial glow, fine borders, and soft depth.
- Data numerals should be visually confident and highly legible.
- Use color sparingly for action, healthy status, warnings, and critical payment issues.
- Use restrained motion for capacity transitions, plan comparison, and modal entry; respect reduced-motion settings.
- Use the existing Displaygram app shell and design tokens where possible. The Billing experience should feel elevated, not disconnected from the product.
- Produce an accessible light-theme direction and show how the system adapts to dark theme if the product supports it.

REQUIRED DESKTOP STATES

1. Healy distributor on grandfathered Healy plan, healthy subscription, distributor choices only.
2. Distributor on Free, approaching both limits, with a data-backed recommended upgrade.
3. Distributor on a paid plan with all available distributor plans exposed in comparison mode.
4. Supplier on Supplier Growth with supplier-only choices and distributor-connection language.
5. Paid company with a scheduled downgrade.
6. Past-due company where updating payment is the primary action.
7. Upgrade confirmation/checkout.
8. Downgrade confirmation including effective date and capacity consequences.

REQUIRED SYSTEM STATES

- loading/skeleton;
- plan-catalog failure with retry;
- missing or unsupported company type with a safe support state and no plan choices;
- empty eligible catalog;
- near capacity and over capacity;
- inactive or canceled subscription;
- payment processing, success, and recoverable failure;
- current legacy plan unavailable for new purchase but still valid for continuity.

RESPONSIVE DELIVERABLES

Design at minimum:

- 1440px desktop;
- 1024px compact desktop/tablet landscape;
- 768px tablet;
- 390px mobile.

ACCESSIBILITY

- WCAG AA contrast;
- clear keyboard focus;
- semantic hierarchy;
- touch targets of at least 44px;
- no color-only meaning;
- screen-reader-friendly status and capacity language;
- layouts that tolerate text scaling and longer plan names;
- reduced-motion behavior.

OUTPUT I EXPECT

1. A polished high-fidelity Billing & Plans screen, not just a mood board.
2. A clear component and layout system that engineers can implement in React/CSS.
3. Desktop, tablet, and mobile variants.
4. All required billing states and interaction flows.
5. Exact concise UI copy for headings, labels, helper text, CTAs, status messages, confirmations, success, and errors.
6. Interaction annotations explaining progressive disclosure, recommendation logic, plan deltas, upgrade timing, downgrade timing, and payment priority.
7. Design-token guidance for spacing, radius, elevation, typography, color, focus, and motion.
8. A short engineering handoff listing reusable components and responsive behavior.

Be opinionated. Simplify aggressively. Make the customer feel oriented within seconds and confident before any plan or payment action. The result should communicate that Displaygram understands the shape and momentum of their business network while remaining clean, credible, and easy to use.
```

---

## Suggested material to attach to Fable 5

For better visual continuity, attach:

- desktop and mobile screenshots of the current Billing page;
- the current app shell/dashboard screenshot;
- light and dark theme screenshots if both are supported;
- the Displaygram logo and any established design tokens;
- screenshots of the checkout, scheduled-downgrade, and past-due states.

Fable should not receive real customer payment data, negotiated prices, email addresses, Braintree identifiers, or production company IDs. Use representative sample data in design frames.

