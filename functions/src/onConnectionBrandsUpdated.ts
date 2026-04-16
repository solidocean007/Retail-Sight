import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const updateVisibility = async (
  sourceCompanyId: string,
  targetCompanyId: string,
  brands: string[],
  mode: "add" | "remove"
) => {
  console.log("🔥 updateVisibility called", {
    sourceCompanyId,
    targetCompanyId,
    brands,
  });
  if (brands.length === 0) {
    return;
  }
  const postsSnap = await db
    .collection("posts")
    .where("companyId", "==", sourceCompanyId)
    .where("migratedVisibility", "==", "network")
    .get();

  if (postsSnap.empty) {
    return;
  }

  console.log("🔥 posts found:", postsSnap.size);

  const batch = db.batch();
  const normalize = (s: string) => s.trim().toUpperCase();
  const targetBrands = brands.map(normalize);

  postsSnap.forEach((doc) => {
    const post = doc.data();

    const postBrands = (
      Array.isArray(post.brands) ? post.brands : Object.keys(post.brands || {})
    ).map(normalize);

    const matches = targetBrands.some((b) => postBrands.includes(b));

    if (!matches) return;

    batch.update(doc.ref, {
      sharedWithCompanies:
        mode === "add"
          ? FieldValue.arrayUnion(targetCompanyId)
          : FieldValue.arrayRemove(targetCompanyId),
    });
  });
  await batch.commit();
};

const extractBrands = (arr: any[]): string[] =>
  (arr || [])
    .map((b) => (typeof b === "string" ? b : b?.brand))
    .filter(Boolean);

/**
 * Trigger: companyConnections/{connectionId}
 * Keeps posts in sync with shared brand changes.
 * Adds and removes partner company visibility as needed.
 */
export const onConnectionBrandsUpdated = onDocumentUpdated(
  "companyConnections/{connectionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    const { requestFromCompanyId, requestToCompanyId } = after;
    const connectionId = event.params.connectionId;

    if (after.status !== "approved") {
      return;
    }

    const beforeBrands = extractBrands(before.sharedBrands);
    const afterBrands = extractBrands(after.sharedBrands);

    const newShared = afterBrands.filter((b) => !beforeBrands.includes(b));

    const removedShared = beforeBrands.filter((b) => !afterBrands.includes(b));

    try {
      // Add new shares
      await Promise.all([
        updateVisibility(
          requestFromCompanyId,
          requestToCompanyId,
          newShared,
          "add"
        ),
        updateVisibility(
          requestToCompanyId,
          requestFromCompanyId,
          newShared,
          "add"
        ),
      ]);

      // Remove revoked shares
      await Promise.all([
        updateVisibility(
          requestFromCompanyId,
          requestToCompanyId,
          removedShared,
          "remove"
        ),
        updateVisibility(
          requestToCompanyId,
          requestFromCompanyId,
          removedShared,
          "remove"
        ),
      ]);

      await db.collection("connectionHistory").add({
        event: "connection_brands_sync",
        connectionId,
        added: newShared,
        removed: removedShared,
        fromCompanyId: requestFromCompanyId,
        toCompanyId: requestToCompanyId,
        companyIds: [requestFromCompanyId, requestToCompanyId],
        sharedBrandNames: afterBrands,
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Brand sync complete for ${connectionId}`);
    } catch (err) {
      console.error("❌ Error updating shared brands:", err);
    }
  }
);
