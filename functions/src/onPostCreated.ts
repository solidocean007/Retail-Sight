import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Trigger: posts/{postId}
 * Purpose:
 *  1. When a new post is created, find all approved companyConnections
 *     whose sharedBrands overlap with this post’s brands.
 *  2. Write those connected companyIds into the post.sharedWithCompanies array.
 *  3. Write an audit log entry for visibility tracking.
 */
export const onPostCreated = onDocumentCreated(
  "posts/{postId}",
  async (event) => {
    const postId = event.params.postId;
    const postData = event.data?.data();

    if (!postData) {
      console.log(`⚠️ No post data found for ${postId}`);
      return;
    }

    const { companyId, migratedVisibility, brands } = postData;

    // Only run for network-visible posts with brands
    if (
      migratedVisibility !== "network" ||
      !Array.isArray(brands) ||
      brands.length === 0
    ) {
      console.log(
        `ℹ️ Skipping post ${postId}: not network-visible or has no brands.`
      );
      return;
    }

    try {
      // 1️⃣ Get all approved connections where this company is either sender or receiver
      const connectionsSnap = await db
        .collection("companyConnections")
        .where("status", "==", "approved")
        .where("sharedBrands", "array-contains-any", brands)
        .get();

      if (connectionsSnap.empty) {
        console.log(`ℹ️ No matching connections found for post ${postId}.`);
        return;
      }

      const sharedWith = new Set<string>();

      // 2️⃣ Determine which connected companies should receive this post
      connectionsSnap.forEach((connDoc) => {
        const conn = connDoc.data();
        const { requestFromCompanyId, requestToCompanyId } = conn;

        if (companyId === requestFromCompanyId) {
          sharedWith.add(requestToCompanyId);
        } else if (companyId === requestToCompanyId) {
          sharedWith.add(requestFromCompanyId);
        }
      });

      if (sharedWith.size === 0) {
        console.log(`ℹ️ No reciprocal connections for post ${postId}.`);
        return;
      }

      // 3️⃣ Update post.sharedWithCompanies
      await db
        .collection("posts")
        .doc(postId)
        .update({
          sharedWithCompanies: FieldValue.arrayUnion(...Array.from(sharedWith)),
          autoSharedAt: FieldValue.serverTimestamp(),
        });

      // 4️⃣ Write audit entry
      await db.collection("connectionHistory").add({
        event: "post_auto_shared",
        postId,
        sourceCompanyId: companyId,
        sharedBrands: brands,
        sharedWithCompanies: Array.from(sharedWith),
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(
        `✅ Post ${postId} auto-shared with companies:`,
        Array.from(sharedWith)
      );
    } catch (err) {
      console.error("❌ Error processing new post:", err);
    }
  }
);
