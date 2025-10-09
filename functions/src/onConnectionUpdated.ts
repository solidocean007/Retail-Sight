import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Trigger: companyConnections/{connectionId}
 * Purpose:
 *  - Detect when sharedBrands array changes on an already approved connection
 *  - Retroactively share posts between companies for the new brands
 */
export const onConnectionBrandsUpdated = onDocumentUpdated(
  "companyConnections/{connectionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    // Run only for approved connections
    if (after.status !== "approved") {
      return;
    }

    // Exit if sharedBrands didn't change
    const beforeBrands = JSON.stringify(before.sharedBrands || []);
    const afterBrands = JSON.stringify(after.sharedBrands || []);
    if (beforeBrands === afterBrands) {
      return;
    }

    const { requestFromCompanyId, requestToCompanyId, sharedBrands } = after;
    const connectionId = event.params.connectionId;

    console.log(
      `🔁 Brands updated for connection ${connectionId}:`,
      sharedBrands
    );

    if (!Array.isArray(sharedBrands) || sharedBrands.length === 0) {
      return;
    }

    try {
      // 🔹 Share from -> to
      const postsSnap = await db
        .collection("posts")
        .where("companyId", "==", requestFromCompanyId)
        .where("migratedVisibility", "==", "network")
        .where("brands", "array-contains-any", sharedBrands)
        .get();

      if (!postsSnap.empty) {
        const batch = db.batch();
        for (const doc of postsSnap.docs) {
          batch.update(doc.ref, {
            sharedWithCompanies: FieldValue.arrayUnion(requestToCompanyId),
          });
        }
        await batch.commit();
      }

      // 🔹 Share reverse (to -> from)
      const reversePostsSnap = await db
        .collection("posts")
        .where("companyId", "==", requestToCompanyId)
        .where("migratedVisibility", "==", "network")
        .where("brands", "array-contains-any", sharedBrands)
        .get();

      if (!reversePostsSnap.empty) {
        const reverseBatch = db.batch();
        for (const doc of reversePostsSnap.docs) {
          reverseBatch.update(doc.ref, {
            sharedWithCompanies: FieldValue.arrayUnion(requestFromCompanyId),
          });
        }
        await reverseBatch.commit();
      }

      // 🔹 Optional audit
      await db.collection("connectionHistory").add({
        event: "connection_brands_updated",
        connectionId,
        fromCompanyId: requestFromCompanyId,
        toCompanyId: requestToCompanyId,
        sharedBrands,
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Brand sync complete for connection ${connectionId}`);
    } catch (err) {
      console.error("❌ Error syncing updated brands:", err);
    }
  }
);
