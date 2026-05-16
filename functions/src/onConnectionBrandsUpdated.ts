import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

export const updateVisibility = async ({
  sourceCompanyId,
  targetCompanyId,
  brandIds = [],
  brandNames = [],
  mode,
}: {
  sourceCompanyId: string;
  targetCompanyId: string;
  brandIds?: string[];
  brandNames?: string[];
  mode: "add" | "remove";
}) => {
  console.log("🔥 updateVisibility called", {
    sourceCompanyId,
    targetCompanyId,
    brandIds,
    brandNames,
    mode,
  });

  if (brandIds.length === 0 && brandNames.length === 0) return;

  const postsSnap = await db
    .collection("posts")
    .where("companyId", "==", sourceCompanyId)
    .where("migratedVisibility", "==", "network")
    .get();

  if (postsSnap.empty) return;

  const normalize = (s: string) =>
    String(s || "")
      .trim()
      .toUpperCase();

  const targetBrandIds = new Set(brandIds.map((id) => String(id).trim()));
  const targetBrandNames = new Set(brandNames.map(normalize));

  const batch = db.batch();
  let updateCount = 0;

  postsSnap.forEach((docSnap) => {
    const post = docSnap.data();

    const postBrandIds = Array.isArray(post.brandIds)
      ? post.brandIds.map((id: string) => String(id).trim())
      : [];

    const postBrandNames = (
      Array.isArray(post.brands) ? post.brands : Object.keys(post.brands || {})
    ).map(normalize);

    const idMatch =
      targetBrandIds.size > 0 &&
      postBrandIds.some((id: string) => targetBrandIds.has(id));

    const nameMatch =
      targetBrandNames.size > 0 &&
      postBrandNames.some((name: string) => targetBrandNames.has(name));

    if (!idMatch && !nameMatch) return;

    batch.update(docSnap.ref, {
      sharedWithCompanies:
        mode === "add"
          ? FieldValue.arrayUnion(targetCompanyId)
          : FieldValue.arrayRemove(targetCompanyId),
    });

    updateCount += 1;
  });

  if (updateCount === 0) {
    console.log("ℹ️ updateVisibility found no matching posts");
    return;
  }

  await batch.commit();

  console.log(`✅ updateVisibility ${mode} complete`, {
    sourceCompanyId,
    targetCompanyId,
    updateCount,
  });
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

    const cleanArray = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.map((v) => String(v || "").trim()).filter(Boolean)
        : [];

    const normalize = (s: string) =>
      String(s || "")
        .trim()
        .toUpperCase();

    const beforeBrandIds = cleanArray(before.sharedBrandIds);
    const afterBrandIds = cleanArray(after.sharedBrandIds);

    const beforeBrandNames = cleanArray(before.sharedBrandNames).map(normalize);
    const afterBrandNames = cleanArray(after.sharedBrandNames).map(normalize);

    const newSharedBrandIds = afterBrandIds.filter(
      (id) => !beforeBrandIds.includes(id)
    );

    const removedSharedBrandIds = beforeBrandIds.filter(
      (id) => !afterBrandIds.includes(id)
    );

    const newSharedBrandNames = afterBrandNames.filter(
      (name) => !beforeBrandNames.includes(name)
    );

    const removedSharedBrandNames = beforeBrandNames.filter(
      (name) => !afterBrandNames.includes(name)
    );

    try {
      await Promise.all([
        updateVisibility({
          sourceCompanyId: requestFromCompanyId,
          targetCompanyId: requestToCompanyId,
          brandIds: newSharedBrandIds,
          brandNames: newSharedBrandNames,
          mode: "add",
        }),
        updateVisibility({
          sourceCompanyId: requestToCompanyId,
          targetCompanyId: requestFromCompanyId,
          brandIds: newSharedBrandIds,
          brandNames: newSharedBrandNames,
          mode: "add",
        }),
      ]);

      await Promise.all([
        updateVisibility({
          sourceCompanyId: requestFromCompanyId,
          targetCompanyId: requestToCompanyId,
          brandIds: removedSharedBrandIds,
          brandNames: removedSharedBrandNames,
          mode: "remove",
        }),
        updateVisibility({
          sourceCompanyId: requestToCompanyId,
          targetCompanyId: requestFromCompanyId,
          brandIds: removedSharedBrandIds,
          brandNames: removedSharedBrandNames,
          mode: "remove",
        }),
      ]);

      await db.collection("connectionHistory").add({
        event: "connection_brands_sync",
        connectionId,
        addedBrandIds: newSharedBrandIds,
        removedBrandIds: removedSharedBrandIds,
        addedBrandNames: newSharedBrandNames,
        removedBrandNames: removedSharedBrandNames,
        fromCompanyId: requestFromCompanyId,
        toCompanyId: requestToCompanyId,
        companyIds: [requestFromCompanyId, requestToCompanyId],
        sharedBrandIds: afterBrandIds,
        sharedBrandNames: afterBrandNames,
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Brand sync complete for ${connectionId}`);
    } catch (err) {
      console.error("❌ Error updating shared brands:", err);
    }
  }
);
