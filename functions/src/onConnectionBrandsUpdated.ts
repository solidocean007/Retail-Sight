import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

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

    const beforeShared = before.sharedBrands || [];
    const afterShared = after.sharedBrands || [];

    const newShared = afterShared.filter(
      (b: string) => !beforeShared.includes(b)
    );
    const removedShared = beforeShared.filter(
      (b: string) => !afterShared.includes(b)
    );

    console.log(`🔁 Brand sync for ${connectionId}`);
    console.log(`🟢 Added: ${newShared}`);
    console.log(`🔴 Removed: ${removedShared}`);

    const updateVisibility = async (
      sourceCompanyId: string,
      targetCompanyId: string,
      brands: string[],
      mode: "add" | "remove"
    ) => {
      if (brands.length === 0) {
        return;
      }
      const postsSnap = await db
        .collection("posts")
        .where("companyId", "==", sourceCompanyId)
        .where("migratedVisibility", "==", "network")
        .where("brands", "array-contains-any", brands)
        .get();

      if (postsSnap.empty) {
        return;
      }

      const batch = db.batch();
      postsSnap.forEach((doc) => {
        batch.update(doc.ref, {
          sharedWithCompanies:
            mode === "add"
              ? FieldValue.arrayUnion(targetCompanyId)
              : FieldValue.arrayRemove(targetCompanyId),
        });
      });
      await batch.commit();

      console.log(
        `${mode === "add" ? "➕" : "➖"} ${
          postsSnap.size
        } posts updated for ${sourceCompanyId} → ${targetCompanyId}`
      );
    };

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
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Brand sync complete for ${connectionId}`);
    } catch (err) {
      console.error("❌ Error updating shared brands:", err);
    }
  }
);
