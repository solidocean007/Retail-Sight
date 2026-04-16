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

    const normalize = (s: string) => s.trim().toUpperCase();

    const brandList = (
      Array.isArray(brands) ? brands : Object.keys(brands || {})
    ).map(normalize);

    if (migratedVisibility !== "network" || brandList.length === 0) {
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
        .where("companyIds", "array-contains", companyId)
        .get();

      if (connectionsSnap.empty) {
        console.log(`ℹ️ No matching connections found for post ${postId}.`);
        return;
      }

      const sharedWith = new Set<string>();

      connectionsSnap.forEach((connDoc) => {
        const conn = connDoc.data();

        const sharedBrandNames = (conn.sharedBrandNames || []).map(normalize);

        const matches = brandList.some((b) => sharedBrandNames.includes(b));

        if (!matches) return;

        const otherCompanyId = conn.companyIds.find(
          (id: string) => id !== companyId
        );

        if (otherCompanyId) {
          sharedWith.add(otherCompanyId);
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
        companyIds: [companyId, ...Array.from(sharedWith)],
        sharedBrandNames: brandList,
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
