import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

/**
 * Trigger: companyConnections/{connectionId}
 * Purpose:
 *  1. Mirror approved connection into each company's subcollection
 *  2. Retroactively share posts between companies based on sharedBrands
 *  3. Write connection audit log
 */
export const onConnectionApproved = onDocumentUpdated(
  "companyConnections/{connectionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) {
      return;
    }

    // Only run when status transitions to "approved"
    if (before.status === after.status || after.status !== "approved") {
      return;
    }

    const { requestFromCompanyId, requestToCompanyId, sharedBrands } = after;
    const connectionId = event.params.connectionId;

    const connDoc = {
      connectionId,
      sharedBrands,
      status: "approved",
      updatedAt: FieldValue.serverTimestamp(),
    };

    // 🔹 Mirror to both companies’ subcollections
    await Promise.all([
      db
        .collection("companies")
        .doc(requestFromCompanyId)
        .collection("companyConnections")
        .doc(connectionId)
        .set(connDoc),
      db
        .collection("companies")
        .doc(requestToCompanyId)
        .collection("companyConnections")
        .doc(connectionId)
        .set(connDoc),
    ]);

    // 🔹 Retroactively share posts with matching brands
    if (Array.isArray(sharedBrands) && sharedBrands.length > 0) {
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
    }

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

    // 🔹 Optional: Audit log
    await db.collection("connectionHistory").add({
      event: "connection_approved",
      fromCompanyId: requestFromCompanyId,
      toCompanyId: requestToCompanyId,
      sharedBrands,
      postCount: sharedBrands?.length ?? 0,
      timestamp: FieldValue.serverTimestamp(),
    });
  }
);
