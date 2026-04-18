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
    if (!before || !after) return;

    const { requestFromCompanyId, requestToCompanyId } = after;
    const connectionId = event.params.connectionId;

    if (after.status !== "approved") return;

    const normalize = (s: string) => s.trim().toUpperCase();

    const beforeBrands = (before.sharedBrandNames || []).map(normalize);
    const afterBrands = (after.sharedBrandNames || []).map(normalize);

    const newShared = afterBrands.filter(
      (b: string) => !beforeBrands.includes(b)
    );
    const removedShared = beforeBrands.filter(
      (b: string) => !afterBrands.includes(b)
    );

    console.log("🔍 connectionId:", connectionId);
    console.log("🔍 beforeBrands:", beforeBrands);
    console.log("🔍 afterBrands:", afterBrands);
    console.log("🔍 newShared:", newShared);
    console.log("🔍 removedShared:", removedShared);

    try {
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

      console.log("before", before.sharedBrandNames);
      console.log("after", after.sharedBrandNames);
      console.log("removedShared", removedShared);

      console.log(`✅ Brand sync complete for ${connectionId}`);
    } catch (err) {
      console.error("❌ Error updating shared brands:", err);
    }
  }
);
