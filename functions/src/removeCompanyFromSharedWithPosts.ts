// functions/src/dev/removeCompanyFromSharedWithPosts.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const removeCompanyFromSharedWithPosts = onCall(
  { region: "us-central1" },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const userSnap = await db.collection("users").doc(uid).get();
    const user = userSnap.data();

    if (user?.role !== "super-admin") {
      throw new HttpsError("permission-denied", "Super admin only.");
    }

    const companyIdToRemove = "4xIjJANCoJV28gLoz6iL";

    const postsSnap = await db
      .collection("posts")
      .where("sharedWithCompanies", "array-contains", companyIdToRemove)
      .get();

    if (postsSnap.empty) {
      return {
        ok: true,
        matched: 0,
        updated: 0,
      };
    }

    let updated = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const docSnap of postsSnap.docs) {
      batch.update(docSnap.ref, {
        sharedWithCompanies: FieldValue.arrayRemove(companyIdToRemove),
        visibilityResetAt: FieldValue.serverTimestamp(),
        visibilityResetReason: "manual_test_reset",
      });

      updated += 1;
      batchCount += 1;

      if (batchCount === 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    await db.collection("connectionHistory").add({
      event: "manual_remove_company_from_shared_posts",
      companyIdRemoved: companyIdToRemove,
      matched: postsSnap.size,
      updated,
      requestedBy: uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      matched: postsSnap.size,
      updated,
      companyIdRemoved: companyIdToRemove,
    };
  }
);
