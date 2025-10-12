import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Trigger: companyConnections/{connectionId}
 * When pendingBrands or sharedBrands change, update shared posts.
 */
export const onConnectionBrandsUpdated = onDocumentUpdated(
  "companyConnections/{connectionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    // Only run for approved connections
    if (after.status !== "approved") {
      return;
    }

    // Compare brand arrays
    const beforeShared = before.sharedBrands || [];
    const afterShared = after.sharedBrands || [];

    const newShared = afterShared.filter(
      (b: string) => !beforeShared.includes(b)
    );
    if (newShared.length === 0) {
      return;
    } // nothing new shared

    const { requestFromCompanyId, requestToCompanyId } = after;
    const connectionId = event.params.connectionId;

    console.log(`🔁 New shared brands for ${connectionId}:`, newShared);

    try {
      // Share posts in both directions
      const shareInBothDirections = async (
        sourceCompanyId: string,
        targetCompanyId: string
      ) => {
        const postsSnap = await db
          .collection("posts")
          .where("companyId", "==", sourceCompanyId)
          .where("migratedVisibility", "==", "network")
          .where("brands", "array-contains-any", newShared)
          .get();

        if (!postsSnap.empty) {
          const batch = db.batch();
          postsSnap.forEach((doc) => {
            batch.update(doc.ref, {
              sharedWithCompanies: FieldValue.arrayUnion(targetCompanyId),
            });
          });
          await batch.commit();
        }
      };

      await Promise.all([
        shareInBothDirections(requestFromCompanyId, requestToCompanyId),
        shareInBothDirections(requestToCompanyId, requestFromCompanyId),
      ]);

      // Audit entry
      await db.collection("connectionHistory").add({
        event: "connection_brands_approved",
        connectionId,
        newShared,
        fromCompanyId: requestFromCompanyId,
        toCompanyId: requestToCompanyId,
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Shared brand sync complete for ${connectionId}`);
    } catch (err) {
      console.error("❌ Error updating shared brands:", err);
    }
  }
);
