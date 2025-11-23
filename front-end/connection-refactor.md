✅ 1. Rewrite the Connection Flow (Core UX)

 ⚪⬜Add a unified “Start a Connection” button to CompanyConnectionsManager

 ⬜ Replace the old single-step builder with a new 2-step flow:

  ⬜Step 1 — Identify Company

  ⬜Input: admin email

 Lookup user/company

 If found → continue to Step 2

 If not found → trigger Invite & Connect Modal

 Add optional fields:

 Company Name (autofill if known)

 Company Type (Supplier / Distributor)

 Create InviteAndConnectModal:

 Show message: “This admin is not on Displaygram yet. Would you like to invite them?”

 Buttons: Send Invite + Attach Connection Proposal, Cancel

✅ 2. Implement Email Existence Check (Cloud Functions)

 Add new Cloud Function: checkUserExists(email)

 Returns { exists, companyId, role, isOnboarded }

 Integrate this call into Step 1 logic in ConnectionBuilder

 Handle loading + error states cleanly

✅ 3. Build Invite Flow + Staged Connection

 Add Cloud Function createInviteAndDraftConnection()

 Write to pendingInvites/

 Create a draft companyConnections doc with:

 initiating company

 target email

 pending shared brands (if selected)

 Add Cloud Function acceptInvite()

 Triggered when a new user signs up from an invite link

 Auto-create their company

 Attach staged connection

 Mark it as pending approval

 Add Firestore schema documentation to README

✅ 4. Refactor Brand Proposal Flow

 Ensure brand selection appears in Step 2

 Pre-populate Step 2 with the user’s known brands

 Allow adding custom brands

 Auto-add brand proposals to staged connections for non-users

 Update ConnectionEditModal UI to match new structure (file ref: )

✅ 5. Improve Connection Education (What It Means)

Add a “How Connections Work” collapsible panel in CompanyConnectionsManager (file ref: ):

 What a connection is

 Why both parties approve brands

 What visibility is granted

 How the free plan limits 2 connections

 Add icons, clearer writing

 Add “Show examples” section

✅ 6. Collection Sharing Logic (Cross-Company Visibility)

 Update ViewCollection.tsx & CollectionsViewer.tsx to enforce:

 user must belong to a connected company

 connection must be approved

 at least one shared brand matches post brands

 isShareableOutsideCompany = true

 Update Firestore security rules:

 Allow read only if:

collection.isShareableOutsideCompany == true
&& requesterCompany in collection.sharedWithCompanies


 Auto-fill sharedWithCompanies when connection is approved

✅ 7. Update Connection Cards UI

Files to modify:

CompanyConnectionCard.tsx ()

companyConnectionCard.css

Checklist:

 Simplify top-level view

 Show roles clearly: Requested By, Receiving Company

 Break into sub-sections:

 Overview

 Shared Brands

 Pending Proposals

 More readable status badges

✅ 8. Clean Up ConnectionEditModal

Files:

ConnectionEditModal.tsx ()

connectionEditModal.css

Tasks:

 Split UI into 3 tabs:

 Shared Brands

 Pending Brands

 Propose Brands

 Move supplier dropdown into its own card

 Use theme.css styling and remove inline clutter

✅ 9. Developer Testing Helpers

Add hidden dev-only buttons (in local/dev mode only):

 “Simulate: recipient exists”

 “Simulate: recipient not found”

 “Simulate: auto-approve connection”

 Add debug logging

✅ 10. Update README + Help Docs

 Add “What is a Connection?”

 Add diagrams for:

 Normal connection request

 Invite flow

 Shared-brand approval flow

 What visibility each role gets

 Provide examples: distributor ↔ supplier

 Document new Cloud Functions

 Include updated security rules

 Add FAQ section:

 “Why do we match by brands?”

 “Do pending connections count against my plan?”

 “What if I invite someone not on Displaygram?”

Completion Criteria

The branch is “done” when:

 New connection flow is frictionless

 Invites work for non-users

 Connections automatically stage on signup

 Shared-brand filtering is enforced everywhere

 Collections respect new visibility rules

 UI is cleaner, simpler, and self-explanatory

 README fully documents all flows