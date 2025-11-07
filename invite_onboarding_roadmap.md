# 🚀 Displaygram Invite‑Only Onboarding Roadmap

### 🎯 Goal  
Convert the current mixed signup/request flow into a clean **invite‑only onboarding system** that avoids password confusion and gives admins full control.

---

## ✅ Phase 1 — Simplify Request Access (Frontend)
**Component:** `RequestAccessForm.tsx`  
**Purpose:** Only collect contact + company info; no passwords.

- [ ] Remove password + verify password fields from UI.
- [ ] Update labels: _“Request Access”_ → _“Submit Company Access Request.”_
- [ ] Validate only: name, email, company, type, phone (optional), notes.
- [ ] Submit to backend Cloud Function `createCompanyOrRequest`.
- [ ] On success → navigate to `/request-submitted` page (new static screen).

---

## ✅ Phase 2 — Backend: CreateCompanyOrRequest Function
**File:** `functions/src/createCompanyOrRequest.ts`  
**Purpose:** Handle submission, create provisional company if new, log access request, notify admin.

- [ ] Import helpers from `companyLogic.ts`:  
  `normalizeCompanyInput`, `findMatchingCompany`, `createNewCompany`
- [ ] Validate input (companyName, email, etc.)
- [ ] Check for existing company in Firestore.
- [ ] If exists → add `accessRequests` doc with `status: 'pending-approval'`.
- [ ] If not → call `createNewCompany()` → add provisional company → log request.
- [ ] Write Firestore `mail` doc → to `support@displaygram.com` notifying admin.
- [ ] Return `{ ok: true }`.

---

## ✅ Phase 3 — Request Submitted Page
**Component:** `RequestSubmitted.tsx`  
**Purpose:** Confirm submission and show next steps.

- [ ] Create new route `/request-submitted`.
- [ ] Display confirmation + steps:
  - ✅ We’ll verify your company.
  - 📬 Look for an email from `support@displaygram.com`.
  - 🚀 Once approved, you’ll receive an invite link to set your password.
- [ ] Include buttons: `Return Home` + `Contact Support`.

---

## ✅ Phase 4 — Developer Dashboard: Access Requests Panel
**Component:** `AccessRequestsPanel.tsx` (new)  
**Purpose:** Let admins view and approve/reject pending access requests.

- [ ] Fetch `accessRequests` collection ordered by `createdAt`.
- [ ] Display: Name, Email, Company, Type, Status.
- [ ] Approve → calls new Cloud Function `approveAccessRequest`.
- [ ] Reject → updates Firestore doc status `rejected` + sends rejection email.

---

## ✅ Phase 5 — Backend: ApproveAccessRequest Function
**File:** `functions/src/approveAccessRequest.ts`  
**Purpose:** Turn a pending access request into an active user + verified company.

- [ ] Read `accessRequests/{id}` doc.
- [ ] If company doesn’t exist → call `createNewCompany()`.
- [ ] Create new Firebase Auth user with `request.workEmail`.
- [ ] Add user to `companies/{companyId}/users`.
- [ ] Update company `verified: true`.
- [ ] Update access request `status: 'approved'`.
- [ ] Write `mail` doc sending invite email with unique token → `/accept-invite/:token`.
- [ ] Return `{ ok: true }`.

---

## ✅ Phase 6 — Invite Acceptance Flow
**Component:** `InviteAcceptForm.tsx`  
**Purpose:** Allow invited user to set password and activate account.

- [ ] Accept token param → validate with Firestore or custom claims.
- [ ] Prompt user to set new password.
- [ ] Create Firebase Auth record / link to existing.
- [ ] Redirect to `/login` → user logs in.

---

## ✅ Phase 7 — Email Templates (Firestore → Mail)
**Collection:** `mail`  
**Purpose:** Trigger notifications automatically.

- [ ] `access_request_received` → sent to admin.
- [ ] `access_request_approved` → invite email to user.
- [ ] `access_request_rejected` → polite rejection notice.
- [ ] Ensure subject, text, and replyTo fields match Displaygram tone.

---

## ✅ Phase 8 — QA & Integration Tests

- [ ] Submit new request from non‑auth user.
- [ ] Verify `accessRequests` + `mail` docs created correctly.
- [ ] Approve via dashboard → Auth user + invite email appear.
- [ ] Complete invite flow → user logs in → company verified.
- [ ] Confirm rejection path works and sends proper email.

---

## 🧩 Supporting Files
- `/utils/companyLogic.ts` (existing helpers)
- `/functions/src/createCompanyOrRequest.ts`
- `/functions/src/approveAccessRequest.ts`
- `/components/Auth/RequestAccessForm.tsx`
- `/components/Auth/RequestSubmitted.tsx`
- `/components/Auth/InviteAcceptForm.tsx`
- `/components/DeveloperDashboard/AccessRequestsPanel.tsx`

---

## 🎉 Final Outcome
- Users no longer enter passwords during request.
- Admins have full control of approvals.
- Approved users receive secure invite links.
- Displaygram onboarding becomes clear, compliant, and scalable.

