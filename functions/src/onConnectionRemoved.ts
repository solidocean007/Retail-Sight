import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
const db = getFirestore();

export const onConnectionRemoved = onDocumentUpdated(
  "companyConnections/{connectionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const wasApproved = before.status === "approved";
    const isNowRemoved =
      after.status === "cancelled" || after.status === "rejected";

    if (!wasApproved || !isNowRemoved) return;

    const { requestFromCompanyId, requestToCompanyId } = after;

    const connectionId = event.params.connectionId;

    // 🔻 Decrement usage
    await Promise.all([
      db
        .collection("companies")
        .doc(requestFromCompanyId)
        .update({
          "usage.connections": FieldValue.increment(-1),
        }),
      db
        .collection("companies")
        .doc(requestToCompanyId)
        .update({
          "usage.connections": FieldValue.increment(-1),
        }),
    ]);

    // 🔻 Remove mirrored subcollection docs
    await Promise.all([
      db
        .collection("companies")
        .doc(requestFromCompanyId)
        .collection("companyConnections")
        .doc(connectionId)
        .delete(),
      db
        .collection("companies")
        .doc(requestToCompanyId)
        .collection("companyConnections")
        .doc(connectionId)
        .delete(),
    ]);

    // 🔻 Remove shared visibility from posts
    const postsSnap = await db
      .collection("posts")
      .where("sharedWithCompanies", "array-contains", requestFromCompanyId)
      .get();

    const batch = db.batch();
    postsSnap.forEach((doc) => {
      batch.update(doc.ref, {
        sharedWithCompanies: FieldValue.arrayRemove(requestToCompanyId),
      });
    });
    await batch.commit();

    // 🧾 Audit
    await db.collection("connectionHistory").add({
      event: "connection_removed",
      connectionId,
      fromCompanyId: requestFromCompanyId,
      toCompanyId: requestToCompanyId,
      timestamp: FieldValue.serverTimestamp(),
    });
  }
);
