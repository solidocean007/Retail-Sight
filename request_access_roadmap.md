# 🧭 Request Access & Approval System — Development Roadmap

## 2026-08-30 — Branded access request and abuse hardening

Branch: `feat/request-access-hardening`

### Implemented

- Rebuilt `/request-access` as a responsive, branded two-panel experience
  using the existing Displaygram SVG logo.
- Added plain-language Distributor and Supplier / brand definitions.
- Added layered low-friction abuse controls: a honeypot, minimum form dwell
  signal, suspicious URL suppression, strict server-side field validation,
  duplicate pending-request suppression, and a three-request-per-network
  24-hour rate limit.
- Automated submissions are acknowledged without creating Firestore records,
  provisional companies, or email jobs.
- Company workspaces are now created only after a developer or super-admin
  approves a request.
- Approval and rejection callables now require a server-verified developer or
  super-admin role. Completion also requires the authenticated invite email.
- Approval now creates a normal seven-day company invite and links to
  `/accept-invite/{companyId}/{inviteId}`. Accepting it completes the related
  access request.
- Access request review fields now use consistent `phone` and `userTypeHint`
  names while retaining the legacy `userType` fallback.
- Firestore rules restrict access request documents to platform reviewers and
  exclude access requests, rate-limit state, pending invites, and mail from the
  temporary authenticated catch-all.
- Added optional Firebase App Check initialization for reCAPTCHA Enterprise.

### Firestore integrity notes

- New collection: `accessRequestRateLimits/{sha256ClientAddress}`. It is
  backend-only and stores counts, timestamps, and an `expiresAt` cleanup hint;
  raw client addresses are not stored.
- `accessRequests` adds `normalizedEmail`, `normalizedName`,
  `submissionMeta`, and consistent `userTypeHint`. Legacy fields remain
  readable by the review UI.
- The temporary catch-all still exists for unrelated collections. Removing it
  should be handled separately with collection-by-collection emulator tests so
  the established application is not broken.

### Deployment prerequisites

1. Deploy the frontend, Functions, and Firestore rules together because the
   approval link and invite status contract changed together.
2. Register the production web app with Firebase App Check using reCAPTCHA
   Enterprise and set `VITE_FIREBASE_APP_CHECK_SITE_KEY`.
3. Use a Firebase App Check debug token locally via
   `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN`.
4. Observe App Check metrics before enabling hard enforcement on the public
   callable; the current abuse controls work without enforcement during the
   rollout.
5. Configure a Firestore TTL policy for `accessRequestRateLimits.expiresAt` to
   remove stale rate-limit documents automatically.

Validation completed locally: frontend production build, Functions lint and
TypeScript build, Firestore rules dry-run compilation, desktop layout, current
in-app viewport, company-type interaction, and browser console errors.

### 🌟 Goal  
Enable new users to request company access, automatically record requests in Firestore, notify admins via the `mail` service, and allow approval through the Developer Dashboard — creating or linking companies dynamically.

---

## ✅ Phase 1 — Frontend Request Flow
**Component:** `RequestAccessForm.tsx`  
**Purpose:** Collect new user and company info, then submit to Firebase Function.

- [✅] On submit, call Cloud Function `createCompanyOrRequest`
- [✅] Show success modal (`OnboardingSuccessModal` variant `"submitted"`)
- [✅] Redirect back to `/` with onboarding modal trigger (`localStorage`)
- [✅] Ensure form validation for password, company, and email are consistent

---

## 🧱 Phase 2 — Cloud Function: `createCompanyOrRequest`
**File:** `functions/src/createCompanyOrRequest.ts`  
**Purpose:** Handle form submission, validate company, create Firestore docs, and trigger email.

- [ ] define  helpers inside file:
  - `normalizeCompanyInput`
  - `findMatchingCompany`
  - `createNewCompany`
- [✅] Normalize company name input
- [✅] Query Firestore for an existing company
- [ ] If existing company found:
  - [✅] Create an `accessRequests` doc with `status: "pending-approval"`
  - [✅] Send email to `support@displaygram.com` and optionally the company admin
- [ ✅] If company not found:
  - [✅] Call `createNewCompany()` to make a **provisional** unverified record
  - [ ] Write `accessRequests` doc with `status: "auto-created-company"`
  - [✅] Send confirmation email to requester (via Firestore → mail service)
- [✅] Return `{ ok: true }` JSON on success

---

## 📬 Phase 3 — Firestore Mail Integration
**Collection:** `mail`  
**Purpose:** Automatically notify users/admins through your existing mail trigger.

- [✅] Create a new email template for `access_request_received`
- [✅] Create a new email template for `access_request_admin_notice`
- [✅] Verify Firestore mail docs include `to`, `from`, `subject`, `text` fields
- [✅] Confirm service triggers email successfully (view in Firestore “mail” logs)

---

## 🧑‍💼 Phase 4 — Developer Dashboard: Review Requests
**Component:** `DeveloperDashboard` or new `AccessRequestsPanel.tsx`  
**Purpose:** Allow admins to view, approve, or reject pending requests.

- [✅] Fetch `accessRequests` collection ordered by `createdAt`
- [✅] Display requester info, company name, and status
- [✅] Approve button → calls new Cloud Function `approveAccessRequest`
- [ ] Reject button → updates status to `"rejected"` and sends rejection email

---

## ⚙️ Phase 5 — Cloud Function: `approveAccessRequest`
**File:** `functions/src/approveAccessRequest.ts`  
**Purpose:** Complete the onboarding when an admin approves.

- [✅] Read `accessRequests/{id}`
- [✅] If company doesn’t exist → create with `createNewCompany`
- [✅] Create user record in Firestore and add to `companies/{id}/users`
- [✅] Update company to `verified: true` if it was provisional
- [✅] Update request status → `"approved"`
- [✅] Write new `mail` doc to send “Welcome to Displaygram” email
- [✅] Return `{ ok: true }`

---

## 🪄 Phase 6 — Frontend Onboarding Experience
**Component:** `OnboardingSuccessModal.tsx`  
**Purpose:** Provide onboarding visuals for both `"submitted"` and `"approved"` states.

- [✅] Show `"submitted"` modal after form submission  
- [✅] Show `"approved"` modal after first login post-approval
- [✅] Trigger modal via `localStorage.setItem("showOnboardingModal", "approved")` on approval/login
- [✅] Ensure modal overlay renders above all app content (✅ fix confirmed)
- [ ] Use `variant="approved"` to display setup steps (Add Users → Upload Accounts → Post Displays)

---

## 🔁 Phase 7 — Automation (Optional Next Step)
**Future Enhancements**

- [ ✅] Add Firestore Trigger: when `accessRequests.status` changes to `"approved"`, auto-create company + add user
- [✅] Add Firestore Trigger: when `companies.verified` becomes `true`, send “Welcome” mail automatically
- [✅] Add Admin Email Routing: `support@displaygram.com` receives copies of all requests
- [✅] Create “Access Requests” tab in Developer Dashboard with filtering and sorting

---

## 🦉 Supporting Utilities
**Existing Files Used:**
- `/utils/companyLogic.ts` (already provides `normalizeCompanyInput`, `findMatchingCompany`, `createNewCompany`)
- `/functions/src/createCompanyOrRequest.ts` (new)
- `/functions/src/approveAccessRequest.ts` (new)
- `/components/Auth/RequestAccessForm.tsx`
- `/components/Modals/OnboardingSuccessModal.tsx`
- `/components/DeveloperDashboard/AccessRequestsPanel.tsx` (to be added)

---

## 🚀 Expected Outcome
Once completed:
- New users can securely request access
- Support/admins receive notification emails
- Admins can approve/reject requests
- Approved users auto-link to a company
- Both request and approval states produce polished onboarding modals
