# 📦 Displaygram: Supplier-Distributor Post Sharing Implementation Plan

This document outlines the steps to implement a simple, scalable supplier-distributor sharing system using a `sharedWith` array on each post. It includes Firestore design, sync strategies, cloud function automation, audit tracking, and UX patterns for managing company connections.

---

## 🧱 1. Firestore Schema Changes

### 📝 Post Document (Extended)
```ts
posts/{postId} {
  companyId: string;                // Distributor who created the post
  visibility: "companyOnly" | "network";
  brands: string[];                 // e.g., ["voodoo ranger"]
  sharedWith: string[];            // Company IDs (suppliers or distributors)
  highlightedBySuppliers?: string[]; // Optional: who marked it
  ...otherFields
}
```

### 📘 New Collection: `postSharesAudit`
```ts
postSharesAudit/{auditId} {
  postId: string;
  sharedBy: string;         // Company ID (supplier or dist)
  sharedWith: string[];     // Array of company IDs
  timestamp: Timestamp;
  action: "highlight" | "initial-share";
}
```

---

## 🔁 2. IndexedDB Sync Strategy

- Any time `sharedWith` is updated:
  - Call `updatePostInIndexedDB(updatedPost)`
  - Also update Redux store with `updatePost()`
- When fetching posts:
  - Check both `companyId == user.companyId` and `sharedWith` contains `user.companyId`

---

## ⚙️ 3. Cloud Functions

### 🔹 `onPostCreate`
- Trigger: `onCreate` of posts
- Purpose: Add connected suppliers to `sharedWith` if brand matches
- Logic:
  1. Read connected suppliers for `post.companyId`
  2. Check which suppliers have overlapping brands
  3. Append `supplierId` to `sharedWith`

### 🔹 `sharePostWithCompanies`
- Callable function (supplier-triggered)
- Input: `postId`, `distributorIds[]`
- Checks:
  - Auth user is supplier
  - They are in the `sharedWith` already
- Actions:
  - Append `distributorIds[]` to `sharedWith` of post
  - Write to `postSharesAudit`

### 🔹 (Optional) `onConnectionCreated`
- On connection approval:
  - Backfill `sharedWith` on past posts that match brands

---

## 🔐 4. Firestore Rules
```js
match /posts/{postId} {
  allow read: if request.auth.token.companyId in resource.data.sharedWith
               || request.auth.token.companyId == resource.data.companyId;

  allow update: if isPostOwner() || isSharingSupplier();

  function isPostOwner() {
    return request.auth.token.role in ["admin", "super-admin"] &&
           request.auth.token.companyId == resource.data.companyId;
  }

  function isSharingSupplier() {
    return request.auth.token.role == "supplier" &&
           request.resource.data.sharedWith.hasAny([request.auth.token.companyId]);
  }
}
```

---

## 👥 5. UX: Company Connections

### 🔸 Distributor requests connection with Supplier
- Enter known supplier admin’s email
- System checks if that user exists and is an admin
- Shows shared brand selection UI
- Sends request with selected brands
- Supplier admin sees pending requests in dashboard and approves or rejects

### 🔸 Firestore Structure
```ts
connections/{connectionId} {
  distributorId: string;
  supplierId: string;
  status: "pending" | "approved" | "rejected";
  requestedBy: string; // uid
  sharedBrands: string[];
  timestamp: Timestamp;
}
```

---

## 🧠 6. Supplier Dashboard Features
- View:
  - Posts shared with you via `sharedWith`
  - Posts you’ve highlighted (filtered by `highlightedBySuppliers`)
  - Posts shared by you (from `postSharesAudit`)
- Actions:
  - Highlight posts
  - Revoke highlights (optional)
  - Share post with additional distributors

---

## 🛠 7. Next Steps
- [ ] Implement `sharedWith` logic in `usePosts`
- [ ] Write `sharePostWithCompanies` callable
- [ ] Set up `postSharesAudit` writes
- [ ] Update IndexedDB post syncing
- [ ] Build connection request UI
- [ ] Enforce Firestore rules for role-based access

---

This strategy keeps the system lean, readable, and extensible while satisfying real-time sharing and permission requirements.

