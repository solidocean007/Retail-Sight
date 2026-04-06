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

    if (postsSnap.empty) return;

    console.log(`Backfilling ${postsSnap.size} posts for goal ${goalId}`, {
      oldSupplier,
      newSupplier,
    });

    const batch = db.batch();

    postsSnap.docs.forEach((doc) => {
      if (oldSupplier) {
        batch.update(doc.ref, {
          sharedWithCompanies:
            admin.firestore.FieldValue.arrayRemove(oldSupplier),
        });
      }

      if (newSupplier) {
        batch.update(doc.ref, {
          sharedWithCompanies:
            admin.firestore.FieldValue.arrayUnion(newSupplier),
        });
      }
    });

    await batch.commit();
  }
);
