# 🧭 Request Access & Approval System — Development Roadmap

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

