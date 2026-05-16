import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

const normalize = (value: string) =>
  String(value || "")
    .trim()
    .toUpperCase();

const cleanStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const getBrandNames = (brands: unknown): string[] => {
  return (
    Array.isArray(brands) ? brands : Object.keys((brands as any) || {})
  ).map(normalize);
};

/**
 * Trigger: posts/{postId}
 * Purpose:
 *  1. When a new network-visible post is created, find approved connections
 *     whose sharedBrandIds/sharedBrandNames overlap with the post.
 *  2. Write matching connected companyIds into post.sharedWithCompanies.
 *  3. Write an audit log entry.
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

    const { companyId, migratedVisibility, brands, brandIds = [] } = postData;

    if (!companyId) {
      console.warn(`⚠️ Skipping post ${postId}: missing companyId`);
      return;
    }

    const postBrandIds = cleanStringArray(brandIds);
    const postBrandNames = getBrandNames(brands);

    if (
      migratedVisibility !== "network" ||
      (postBrandIds.length === 0 && postBrandNames.length === 0)
    ) {
      console.log(
        `ℹ️ Skipping post ${postId}: not network-visible or has no brands.`
      );
      return;
    }

    try {
      const connectionsSnap = await db
        .collection("companyConnections")
        .where("status", "==", "approved")
        .where("companyIds", "array-contains", companyId)
        .get();

      if (connectionsSnap.empty) {
        console.log(`ℹ️ No approved connections found for post ${postId}.`);
        return;
      }

      const sharedWith = new Set<string>();

      connectionsSnap.forEach((connDoc) => {
        const conn = connDoc.data();

        const sharedBrandIds = cleanStringArray(conn.sharedBrandIds);
        const sharedBrandNames = cleanStringArray(conn.sharedBrandNames).map(
          normalize
        );

        const idMatch =
          sharedBrandIds.length > 0 &&
          postBrandIds.some((id) => sharedBrandIds.includes(id));

        const nameMatch =
          sharedBrandNames.length > 0 &&
          postBrandNames.some((name) => sharedBrandNames.includes(name));

        if (!idMatch && !nameMatch) return;

        const otherCompanyId = Array.isArray(conn.companyIds)
          ? conn.companyIds.find((id: string) => id !== companyId)
          : null;

        if (otherCompanyId) {
          sharedWith.add(otherCompanyId);
        }
      });

      if (sharedWith.size === 0) {
        console.log(`ℹ️ No reciprocal brand matches for post ${postId}.`);
        return;
      }

      await db
        .collection("posts")
        .doc(postId)
        .update({
          sharedWithCompanies: FieldValue.arrayUnion(...Array.from(sharedWith)),
          autoSharedAt: FieldValue.serverTimestamp(),
        });

      await db.collection("connectionHistory").add({
        event: "post_auto_shared",
        postId,
        sourceCompanyId: companyId,
        companyIds: [companyId, ...Array.from(sharedWith)],
        sharedBrandIds: postBrandIds,
        sharedBrandNames: postBrandNames,
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
