import { onDocumentUpdated } from "firebase-functions/v2/firestore";
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

const arraysChanged = (beforeArray: string[], afterArray: string[]) => {
  if (beforeArray.length !== afterArray.length) return true;

  const beforeSet = new Set(beforeArray);
  const afterSet = new Set(afterArray);

  return (
    beforeArray.some((item) => !afterSet.has(item)) ||
    afterArray.some((item) => !beforeSet.has(item))
  );
};

export const onPostBrandsUpdated = onDocumentUpdated(
  "posts/{postId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after) return;

    const postId = event.params.postId;

    if (after.migratedVisibility !== "network") return;

    const companyId = after.companyId;

    if (!companyId) {
      console.warn(`⚠️ Skipping post ${postId}: missing companyId`);
      return;
    }

    const beforeBrandIds = cleanStringArray(before.brandIds);
    const afterBrandIds = cleanStringArray(after.brandIds);

    const beforeBrandNames = getBrandNames(before.brands);
    const afterBrandNames = getBrandNames(after.brands);

    const brandIdsChanged = arraysChanged(beforeBrandIds, afterBrandIds);
    const brandNamesChanged = arraysChanged(beforeBrandNames, afterBrandNames);

    if (!brandIdsChanged && !brandNamesChanged) return;

    console.log("🔥 onPostBrandsUpdated fired", {
      postId,
      companyId,
      beforeBrandIds,
      afterBrandIds,
      beforeBrandNames,
      afterBrandNames,
    });

    const connectionsSnap = await db
      .collection("companyConnections")
      .where("status", "==", "approved")
      .where("companyIds", "array-contains", companyId)
      .get();

    if (connectionsSnap.empty) {
      console.log(`ℹ️ No approved connections found for post ${postId}.`);
      return;
    }

    /**
     * Supplier-goal guard:
     * If this post is shared with a supplier because of a goal,
     * do not remove that supplier from sharedWithCompanies just because brands changed.
     */
    let goalSupplierId: string | null = null;

    if (after.companyGoalId) {
      const goalSnap = await db
        .collection("companyGoals")
        .doc(after.companyGoalId)
        .get();

      const goalData = goalSnap.data();

      goalSupplierId =
        typeof goalData?.supplierIdForGoal === "string"
          ? goalData.supplierIdForGoal
          : null;
    }

    const connectedCompanyIds = new Set<string>();
    const nextBrandShared = new Set<string>();

    connectionsSnap.forEach((connDoc) => {
      const conn = connDoc.data();

      const otherCompanyId = Array.isArray(conn.companyIds)
        ? conn.companyIds.find((id: string) => id !== companyId)
        : null;

      if (!otherCompanyId) return;

      connectedCompanyIds.add(otherCompanyId);

      const sharedBrandIds = cleanStringArray(conn.sharedBrandIds);

      const sharedBrandNames = cleanStringArray(conn.sharedBrandNames).map(
        normalize
      );

      const idMatch =
        sharedBrandIds.length > 0 &&
        afterBrandIds.some((id) => sharedBrandIds.includes(id));

      const nameMatch =
        sharedBrandNames.length > 0 &&
        afterBrandNames.some((name) => sharedBrandNames.includes(name));

      if (idMatch || nameMatch) {
        nextBrandShared.add(otherCompanyId);
      }
    });

    const prevShared = new Set<string>(
      cleanStringArray(after.sharedWithCompanies)
    );

    const toAdd = Array.from(nextBrandShared).filter(
      (id) => !prevShared.has(id)
    );

    const toRemove = Array.from(connectedCompanyIds).filter((id) => {
      const wasShared = prevShared.has(id);
      const stillBrandShared = nextBrandShared.has(id);
      const stillGoalShared = goalSupplierId === id;

      return wasShared && !stillBrandShared && !stillGoalShared;
    });

    if (toAdd.length === 0 && toRemove.length === 0) {
      console.log(`ℹ️ No sharedWithCompanies changes needed for ${postId}.`);
      return;
    }

    const postRef = db.collection("posts").doc(postId);

    if (toAdd.length > 0) {
      await postRef.update({
        sharedWithCompanies: FieldValue.arrayUnion(...toAdd),
        autoSharedAt: FieldValue.serverTimestamp(),
        visibilityRecheckedAt: FieldValue.serverTimestamp(),
      });
    }

    if (toRemove.length > 0) {
      await postRef.update({
        sharedWithCompanies: FieldValue.arrayRemove(...toRemove),
        visibilityRecheckedAt: FieldValue.serverTimestamp(),
      });
    }

    await db.collection("connectionHistory").add({
      event: "post_brand_visibility_updated",
      postId,
      sourceCompanyId: companyId,
      addedSharedWithCompanies: toAdd,
      removedSharedWithCompanies: toRemove,
      protectedGoalSupplierId: goalSupplierId,
      afterBrandIds,
      afterBrandNames,
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log(`✅ Post ${postId} sharedWithCompanies updated`, {
      added: toAdd,
      removed: toRemove,
      protectedGoalSupplierId: goalSupplierId,
    });
  }
);
