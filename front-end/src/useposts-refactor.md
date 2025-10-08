# 🪝 usePosts Refactor Plan

**Goal:** Unify distributor & supplier feeds, fix missed posts (catch-up), and support filters without breaking current UX.

---

## 🔹 1. Hook Layer

| Task                                                       | Status | Notes                                                                                                    |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Refactor `usePosts` to load IndexedDB → Firestore fallback | ☑️     | Done. Uses cache + `fetchInitialPostsBatch`.                                                             |
| Add real-time listener for `companyOnly` + `network` posts | ☑️     | Done with unified listener + cleanup.                                                                    |
| Allow developers to see *all* posts (ignore filters)       | ☑️     | Implemented in `usePosts`.                                                                               |
| Keep `loadPublic` fallback for unauthenticated or testing  | ☑️     | Implemented in current branch.                                                                           |
| Create new `useSharedPosts()` hook                         | ☑️     | Queries `where("sharedWithCompanies", "array-contains", companyId)` and joins metadata from `/shares`.   |
| Add `useSharedPosts` IndexedDB cache (optional)            | ☑️     | For offline continuity.                                                                                  |

---

## 🔹 2. Thunk & Data Fetching

| Task                                                            | Status | Notes                                                         |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| Update `fetchInitialPostsBatch` to support `migratedVisibility` | ☑️     | Matches `usePosts` filtering.                                 |
| Replace snapshot cursor with serializable `displayDate`         | ☑️     | Implemented; no serialization warnings.                       |
| Add pagination support (`fetchMorePostsBatch`)                  | ☑️     | Working; pagination stable.                                   |
| Create new thunks for `fetchSharedPostsBatch`                   | ☑️     | Mirrors existing thunks but queries by `sharedWithCompanies`. |
| Optionally normalize and store `sharedMeta` in Redux            | ⬜      | Derived from `/shares` subcollection.                         |

---

## 🔹 3. Firestore Schema

| Task                                                    | Status | Notes                                                                        |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| Add `sharedWithCompanies` array on each post            | ☑️     | Implemented in Firestore rules.                                              |
| Add `sharedSummary` object (totalShares, lastSharedAt)  | ⬜      | Optional metadata for quick analytics.                                       |
| Create `/posts/{postId}/shares/{shareId}` subcollection | ⬜      | Holds detailed share metadata.                                               |
| Ensure share docs contain reason + sharedBy fields      | ⬜      | `{ sharedByCompanyId, sharedByUserName, reason, sharedAt, targetCompanyId }` |
| Index `sharedWithCompanies` for fast lookups            | ⬜      | Add Firestore composite index once data exists.                              |

---

## 🔹 4. Cloud Functions

| Function                          | Purpose                                                                                                                   | Status |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------ |
| `onSharePost`                     | Trigger on `/posts/{postId}/shares/{shareId}` creation — updates parent post’s `sharedWithCompanies` and `sharedSummary`. | ⬜      |
| `sharePostWithCompany` (callable) | Validates user’s permissions and writes the `/shares` doc.                                                                | ⬜      |
| `onPostDelete` (optional)         | Removes subcollection shares if a post is deleted.                                                                        | ⬜      |
| `onConnectionApproved`            | Mirror approved connection to both companies’ subcollections, ensure bidirectional visibility, and optionally trigger integration sync (e.g. `galloAxis`). | ⬜      |
| `resolveCompanyEmail` (callable)  | Resolve `requestedEmail` to `companyId` and write to connection doc during creation.                                      | ⬜      |

---

## 🔹 5. UI Layer

| Task                                                     | Status | Notes                                               |
| -------------------------------------------------------- | ------ | --------------------------------------------------- |
| Add SharedFeed and component for shared feed             | ☑️     | Uses `useSharedPosts`.                              |
| Update `PostCard` to render shared metadata banner       | ⬜      | Displays “Shared by X (User Y) — Reason: Z”.        |
| Add share action (supplier dashboard → share post modal) | ⬜      | Triggers callable `sharePostWithCompany`.           |
| Show share analytics in supplier dashboard               | ⬜      | Based on `sharedSummary` or `shares` subcollection. |

---

## 🧩 Company Connections System (New)

- Added **CompanyConnectionsManager** dashboard mode to manage distributor ↔ supplier relationships.  
- Added brand sharing UX with searchable, selectable brand chips.  
- Integrated **CustomConfirmation** modal for connection request confirmation.  
- Implemented **companyConnectionSlice** for Firestore + Redux + IndexedDB sync:
  - `fetchCompanyConnections` (load + cache)  
  - `updateConnectionStatus` (approve/reject)  
  - `setCachedConnections` (hydrate from cache)
- Added **companyConnectionsDBUtils** for offline persistence:
  - `setCompanyConnectionsStore`, `getCompanyConnectionsStore`, `updateCompanyConnectionInStore`, `addConnectionToStore`.
- Extracted **CompanyConnectionList** and **CompanyConnectionCard** for reusable connection rendering.
- All connections now cache locally and load instantly before Firestore sync.
- Branch: `feature/company-connections-mode`
- Future: brand-based post visibility will check `approved companyConnections.sharedBrands`
  to determine which cross-company posts appear in `network` mode.

---

### ❓ Open Questions

- ✅ **Can a test or unverified company send a connection request?**  
  Yes — handled via `createConnectionRequest` thunk, which writes pending requests to `companyConnections`.  
  A planned Cloud Function will validate that both `fromCompanyId` and `requestedEmail` belong to verified company admins before approval.

- ✅ **Will we need a Cloud Function to accept connections and handle mirrored writes?**  
  Yes — `onConnectionApproved` will trigger when a connection’s `status` becomes `"approved"`, writing mirrored metadata into both companies’ `/companyConnections/{id}` subcollections, ensuring both can read `sharedBrands` locally.  
  Optionally logs an audit event in `/connectionHistory/{eventId}`.

---

## 🚀 Next Steps / TODO

- [ ] Implement real-time snapshot sync (optional) for immediate UI updates.  
- [ ] Add “integration connections” (e.g. `galloAxisConnections`) separate from company connections.  
- [ ] Support rejecting / revoking connections directly from UI.  
- [ ] Define Cloud Function to auto-resolve `toCompanyId` by admin email during connection creation.  
- [ ] Add audit logging collection (`connectionHistory`) for analytics and traceability.  
