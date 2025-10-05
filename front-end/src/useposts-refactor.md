# 🪝 usePosts Refactor Plan
**Goal:** Unify distributor & supplier feeds, fix missed posts (catch-up), and support filters without breaking current UX.

---

## 🔹 1. Define Hook API
```ts
type UsePostsMode =
  | { type: "company"; companyId: string }
  | { type: "supplierNetwork"; supplierId: string }
  | { type: "highlighted"; supplierId: string };

interface UsePostsOptions {
  mode: UsePostsMode;
  batchSize?: number;             // default: 10
  filters?: PostQueryFilters;     // optional
}
```

- Keep backward-compatibility with current usage:  
  `usePosts(companyId, batchSize)` → maps to `{ type: "company", companyId }`.

---

## 🔹 2. Implement Catch-Up Fetch
- On mount or resume:
  1. Get `lastSeenTimestamp` from IndexedDB.  
  2. Fetch all posts newer than that, in batches, until empty.  
  3. Merge into Redux + IndexedDB.  
  4. Update `lastSeenTimestamp`.  

- Ensures no posts are lost if device was dormant.

---

## 🔹 3. Attach Realtime Listener
- After catch-up, subscribe with `onSnapshot`.  
- Branch query by `mode`:
  - **Company:** `where("companyId", "==", companyId)` + `visibility in ["companyOnly","network"]`.  
  - **Supplier Network:**  
    - Look up active connections (`supplierId == current`).  
    - For each distributor connection, query posts where `companyId == distributorId`, `visibility == "network"`, and `brands array-contains-any connection.sharedBrands`.  
  - **Highlighted:** `where("highlightedBySuppliers", "array-contains", supplierId)`.  

---

## 🔹 4. Merge & Store
- Normalize posts (`normalizePost`).  
- Dispatch to Redux (`mergeAndSetPosts`).  
- Store in IndexedDB (`addPostsToIndexedDB`).  
- Maintain separate caches for filtered sets.

---

## 🔹 5. Support Filters
- Expose:
  - `posts`: current live feed.  
  - `applyFilters(filters: PostQueryFilters)`: re-run batched fetch, swap in filtered set.  
  - `resetFilters()`: return to live feed.  

- Re-use `EnhancedFilterSidebar` → no major changes needed.

---

## 🔹 6. Update ActivityFeed
- Replace current call:  
  ```ts
  usePosts(currentUserCompanyId, POSTS_BATCH_SIZE);
  ```
- With:  
  ```ts
  usePosts({ mode: { type: "company", companyId: currentUserCompanyId }, batchSize: POSTS_BATCH_SIZE });
  ```
- Keep old signature working during transition.

---

## 🔹 7. QA Checklist
- **Dormant device**: wake → fetches all missed posts.  
- **Distributor feed**: still works, no missing posts.  
- **Supplier feed**: mock a connection → only sees posts with overlapping brands.  
- **Highlight feed**: supplier highlights → distributor sees it.  
- **Filters**: sidebar still applies correctly.  
- **Backwards compatibility**: no crashes in existing ActivityFeed.  

---

✅ Next Step:  
- Create new branch:  
  ```bash
  git checkout -b feature/useposts-network-migration
  ```
- Create new chat with the above outline pinned.  
