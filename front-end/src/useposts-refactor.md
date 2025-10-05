# 🪝 usePosts Refactor Plan

**Goal:** Unify distributor & supplier feeds, fix missed posts (catch-up), and support filters without breaking current UX.

---

## 🔹 1. Hook Layer

```ts
| Task                                                       | Status | Notes                                                                                                    |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Refactor `usePosts` to load IndexedDB → Firestore fallback | ☑️     | Done. Uses cache + `fetchInitialPostsBatch`.                                                             |
| Add real-time listener for `companyOnly` + `network` posts | ☑️     | Done with unified listener + cleanup.                                                                    |
| Allow developers to see *all* posts (ignore filters)       | ☑️     | Implemented in `usePosts`.                                                                               |
| Keep `loadPublic` fallback for unauthenticated or testing  | ☑️     | Implemented in current branch.                                                                           |
| Create new `useSharedPosts()` hook                         | ⬜      | Will query `where("sharedWithCompanies", "array-contains", companyId)` and join metadata from `/shares`. |
| Add `useSharedPosts` IndexedDB cache (optional)            | ⬜      | For offline continuity.                                                                                  |


---

## 🔹 2. Thunk & Data Fetching

| Task                                                            | Status | Notes                                                         |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| Update `fetchInitialPostsBatch` to support `migratedVisibility` | ☑️     | Matches `usePosts` filtering.                                 |
| Replace snapshot cursor with serializable `displayDate`         | ☑️     | Implemented; no serialization warnings.                       |
| Add pagination support (`fetchMorePostsBatch`)                  | ☑️     | Working; pagination stable.                                   |
| Create new thunks for `fetchSharedPostsBatch`                   | ⬜      | Mirrors existing thunks but queries by `sharedWithCompanies`. |
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

---

## 🔹 5. UI / Routes

| Task                                                     | Status | Notes                                               |
| -------------------------------------------------------- | ------ | --------------------------------------------------- |
| Add `/shared` route and component for shared feed        | ⬜      | Uses `useSharedPosts`.                              |
| Update `PostCard` to render shared metadata banner       | ⬜      | Displays “Shared by X (User Y) — Reason: Z”.        |
| Add share action (supplier dashboard → share post modal) | ⬜      | Triggers callable `sharePostWithCompany`.           |
| Show share analytics in supplier dashboard               | ⬜      | Based on `sharedSummary` or `shares` subcollection. |


---

✅ Next Step:

