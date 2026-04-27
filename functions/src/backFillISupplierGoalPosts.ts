import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

const db = admin.firestore();

export const backfillSupplierGoalPosts = onDocumentUpdated(
  "companyGoals/{goalId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    const oldSupplier = before.supplierIdForGoal || null;
    const newSupplier = after.supplierIdForGoal || null;

    if (oldSupplier === newSupplier) return;

    const goalId = event.params.goalId;

    const postsSnap = await db
      .collection("posts")
      .where("companyGoalId", "==", goalId)
      .get();

    if (postsSnap.empty) {
      console.log(
        `[backfillSupplierGoalPosts] No posts found for goal ${goalId}`
      );
      return;
    }

    console.log("[backfillSupplierGoalPosts] Backfilling posts", {
      goalId,
      postCount: postsSnap.size,
      oldSupplier,
      newSupplier,
    });

    const batch = db.batch();

    postsSnap.docs.forEach((postDoc) => {
      const post = postDoc.data();

      const existingSharedWith = Array.isArray(post.sharedWithCompanies)
        ? post.sharedWithCompanies
        : [];

      const nextSharedWith = new Set(existingSharedWith);

      if (oldSupplier) {
        nextSharedWith.delete(oldSupplier);
      }

      if (newSupplier) {
        nextSharedWith.add(newSupplier);
      }

      batch.update(postDoc.ref, {
        sharedWithCompanies: Array.from(nextSharedWith),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    console.log("[backfillSupplierGoalPosts] Complete", {
      goalId,
      postCount: postsSnap.size,
    });
  }
);
