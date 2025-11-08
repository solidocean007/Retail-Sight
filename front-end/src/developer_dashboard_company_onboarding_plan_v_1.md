# Developer Dashboard — Company Onboarding Plan (v1)

> Goal: a focused, owner-grade control surface that helps you review access requests, verify real companies, and get them to a safe, minimal "active" state fast—without tracking noisy or premature metrics.

---

## 0) Principles

* **Start lean, expand later.** Only track data you already write today plus 1–2 new flags to unlock onboarding.
* **Protected direct writes are OK.** For MVP, the Developer Dashboard can write `companies/{id}.verified`, `tier`, and `limits` **directly** when the caller has `role in ['developer','owner']` per Firestore rules. We can add callable functions later only for multi-step actions (e.g., audit bundling) if needed.
* **Backward compatible.** UI works with current fields from `createCompanyOrRequest.js` and shows defaults for future fields.
* **One‑click verification.** Provide a single **Verify Company** action; no extra statuses unless needed for billing/suspension.

---

## 1) Minimal Entities & Fields (current-compatible)

These exist today (per code) or are trivial to add. The UI should rely on these first.

### Company (Firestore: `companies/{companyId}`)

**Existing / implied today**

* `companyName: string`
* `normalizedName: string` (lowercased)
* `companyType: 'distributor' | 'supplier'` *(named `userTypeHint` at request time; stored as `companyType` in company)*
* `verified: boolean` *(present today; UI treats as truthy for verification)*
* `tier: 'free' | 'pro' | 'enterprise'` *(defaults to `free`)*
* `limits: { maxUsers: number, maxConnections: number }` *(seeded in server function)*
* `createdAt: Timestamp`
* `lastUpdated: Timestamp`

**Optional (future-ready, safe to omit now)**

* `primaryContact: { name: string; email: string; phone?: string }`
  **Decision:** ✅ Required. Default to the requester on creation; editable later by admins.
* `accessStatus?: "off" | "limited" | "on";`
  **Decision:** repurpose away from feature-gating. Use only for **billing/collections** or admin suspension. If absent, treat as `'active'`.
* `counts?: { usersTotal?: number; usersPending?: number; connectionsApproved?: number; connectionsPending?: number }`
  **Decision:** ✅ Add to Company type; optional to populate in Phase 1 (can be computed client-side on load or added later via CF).

### Access Requests (Firestore: `accessRequests/{requestId}`)

(Firestore: `accessRequests/{requestId}`)

* From `RequestAccessForm.tsx` + `createCompanyOrRequest.js` today
* Fields: `uid, email, firstName, lastName, phone?, notes?, userTypeHint, companyName, companyId, status('pending'|'approved'|'rejected'), createdAt`

### Users (Firestore: `users/{uid}`)

* Today you upsert: `uid, email, firstName, lastName, companyId, role('pending' | 'employee' | 'admin' | ...), createdAt`

### Invites (Firestore: `invites/{inviteId}`)

* For direct invites in `EmployeesViewer`
* Fields: `companyId, companyName, inviterUid, inviteeEmail, role, status('pending'|'accepted'|...), createdAt, expiresAt, acceptedAt?`

---

## 2) Onboarding States & Gates

**Simplified model (per your prefs):**

* **Verified=false** → company cannot use cross-company features.
* **Verified=true** → company is fully enabled (subject to tier limits).

### Minimal Readiness Checklist (v1)

1. **Admin present** — default the requester to `admin` at approval (editable later).
2. **Company type confirmed** — `companyType` must be set (distributor/supplier).

> No extra gate like "limited". Verification alone unlocks normal behavior; suspension is a separate billing control.

---

## 3) Screens & IA (Information Architecture)

### A) **Access Requests** (primary review queue)

* Table: Name, Email, Company, Type (supplier/distributor), Received date, **Actions**
* Row click → side panel with request details and quick actions

**Row Actions**

* **Approve → Verify Company**: set `verified=true`, set `primaryContact` to requester (if empty), promote requester to `admin`.
* **Approve (without verify)**: create company/user but keep `verified=false` (edge case; hidden behind a dropdown).
* **Reject**: write `status='rejected'` with reason; enqueue email via `mail` collection.

### B) **Companies** (all orgs at a glance) **Companies** (all orgs at a glance)

* Table with: Company, Verified badge, Tier, Created date, Members (count), Access Status, **Manage**
* Filters: Verified, Access status, Tier, Type, Created range
* Row click → drawer with company controls (see below)

### C) **Company Drawer** (single-company control)

* **Summary**: companyName, type, verified badge, tier, createdAt, **primaryContact** (editable)
* **Members**: count + link; quick invite field (optional Phase 2)
* **Verification**: one button **Verify Company** (or **Unverify**) with confirmation
* **Optional extras**: links to Accounts, Brands/Products, Goals (non-blocking)

---

## 4) Minimal Admin Actions (lean, no new CFs required)

Actions can be **direct Firestore writes** from the Developer Dashboard guarded by rules. We can add CFs later if we want atomic multi-step updates + auditing.

1. **Verify / Unverify Company**

   * Write `companies/{id}.verified = true|false`
   * If verifying and `primaryContact` is empty, set it to the requester

2. **Suspend / Unsuspend Account** (optional)

   * Write `companies/{id}.accessStatus = 'suspended' | 'active'`

3. **Approve Access Request**

   * Update `accessRequests/{id}.status = 'approved'`
   * Upsert `users/{uid}` role to `admin` by default (editable)
   * Optionally set `verified=true` in same flow

> If we later need bundling + emails + audits in one shot, we can introduce a single CF: `adminSetCompanyState`.

---

## 5) Data Loading & Backward Compatibility

* **Normalizer** on client: when reading a company, compute:

  * `companyVerified := companyVerified ?? verified ?? false`
  * `accessStatus := accessStatus ?? (companyVerified ? 'limited' : 'off')`
  * `tier := tier ?? 'free'`
  * Safe counts default to `0` when absent
* **UI always uses safe fallbacks** (`?.` and `??`), so no undefined crashes.

---

## 6) MVP Tables (Lean Columns)

### Access Requests

* **Requester** (name + email)
* **Company** (name)
* **Type** (distributor/supplier)
* **Requested** (date)
* **Actions**: Approve (Verify Company | Approve w/o Verify), Reject

### Companies

* **Company** (name + verified badge)
* **Type** (distributor/supplier)
* **Tier** (FREE/PRO/ENT)
* **Members** (count)
* **Created** (date)
* **Manage** (opens drawer)

> We removed the "Access" column. Suspension appears only inside the drawer.

---

## 7) Permissions & Rules (aligned with your current rules)

* Only users with `role='developer'` (and/or a future `owner` role) can call admin functions that modify `verified`, `tier`, `limits`, or `accessStatus`.
* Users cannot modify their own `role` or `companyId` (already enforced in rules).
* Cross-company visibility continues to be managed by existing post/comment sharing rules; onboarding doesn’t loosen them by default.

---

## 8) Tier & Limit Enforcement (v1)

* **Free tier defaults (from server creation):**

  * Distributor: `limits.maxUsers=5`, `limits.maxConnections=1`
  * Supplier: `limits.maxUsers=1`, `limits.maxConnections=1`
* **Client checks**: before invite/connection approval, show upgrade prompt if limit exceeded.
* **Server checks**: callable functions enforce limits authoritatively.

---

## 9) Minimal Audit Trail

For any admin action, write an `audits/{id}` document with:

* `actorUid`, `action`, `companyId`, `before`, `after`, `ts`
  This can be inside a `developerData` collection already restricted by rules.

---

## 10) Emails & Notifications (simple, with your existing mail collection)

* On **approve**/**verify**: add a doc to `mail` to notify the requester ("You’re verified").
* On **reject**: add a doc to `mail` with a brief reason.
* On **suspend**: add a doc to `mail` to notify the primary contact.

---

## 11) Phased Delivery

**Phase 1 (today-ready)**

* Access Requests table + Approve / Reject
* Companies table + Verify/Limited/On toggle in drawer
* Normalizer + safe fallbacks (no schema migration required)

**Phase 2**

* Primary contact editing in drawer
* Soft counts (members), quick invite field
* Basic audits

**Phase 3** (optional, when you’re ready)

* Connection approvals & counts
* Optional onboarding checklist expansion (accounts, products/brands, first goal)
* Aggregated counts via CF triggers

---

## 12) Appendix — Thin Types (to use after we agree on the plan)

> Matches the simplified decisions above. You’ll merge these into your existing `Company` type (adding `counts` and `primaryContact`).

```ts
export type CompanyTier = 'free' | 'pro' | 'enterprise';
export type CompanyType = 'distributor' | 'supplier';
export type AccessStatus = 'active' | 'suspended';

export interface CompanyDoc {
  companyName: string;
  normalizedName?: string;
  companyType?: CompanyType;
  verified?: boolean;                 // current field; primary gate
  tier?: CompanyTier;                 // default 'free'
  limits?: { maxUsers?: number; maxConnections?: number };
  createdAt?: any;                    // TS | Date | string
  lastUpdated?: any;

  // required now
  primaryContact: { name: string; email: string; phone?: string };

  // suspension (billing/admin-only). If absent → 'active'
  accessStatus?: AccessStatus;

  // soft aggregates (optional in Phase 1)
  counts?: { usersTotal?: number; usersPending?: number; connectionsApproved?: number; connectionsPending?: number };
}

export interface CompanyWithId extends CompanyDoc { id: string; }


```

**Client normalizer (pseudo):**

* `verified = !!verified`
* `accessStatus = accessStatus ?? 'active'`
* `tier = tier ?? 'free'`
* `primaryContact = primaryContact ?? { name: requesterName, email: requesterEmail }`
* \`counts = { usersTotal:0, usersPending:0, connectionsApproved:0, connectionsPending:0, ...raw\.counts }

**Client normalizer (pseudo):**

* `companyVerified = companyVerified ?? verified ?? false`
* `accessStatus = accessStatus ?? (companyVerified ? 'limited' : 'off')`
* `tier = tier ?? 'free'`
* `counts = { usersTotal:0, usersPending:0, connectionsApproved:0, connectionsPending:0, ...raw.counts }`

---

## 13) Open Questions → Finalized Decisions (based on your comments)

1. **Approval vs. Verification**
   **Decision:** Approval from the dashboard sets `verified=true` (default). You may also approve without verifying via a secondary action.
2. **First admin**
   **Decision:** Requester becomes the first `admin` by default; editable afterward.
3. **Supplier visibility & connections**
   **Decision:** Upon **company connection**, suppliers can immediately view cross-company posts for **shared brands**. No extra `accessStatus` gating needed.
4. **Suspend & billing**
   **Decision:** Keep `accessStatus` for **billing suspension**. When downgraded for non-payment, freeze new connections and enforce free-tier limits. (Follow-up needed: which existing connections remain if limits shrink — e.g., keep most recent or allow the owner to choose.)
5. **Primary contact**
   **Decision:** Required. Default to requester; editable later.

---

**Next step:** If you’re good with this revision, I’ll generate `developerTypes.ts`, a tiny normalizer, and the two MVP tables (Access Requests + Companies) wired with direct writes + rule guards.
