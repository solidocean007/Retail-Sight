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
    if (!before || !after) return;

    // Only run when status transitions to approved
    if (before.status === after.status || after.status !== "approved") return;

    const {
      requestFromCompanyId,
      requestToCompanyId,
      sharedBrands = [],
    } = after;
    const connectionId = event.params.connectionId;

    const normalize = (s: string) => s.trim().toUpperCase();

    const sharedBrandNames = sharedBrands.map((b: any) => normalize(b.brand));

    // 🔹 Mirror connection
    const connDoc = {
      connectionId,
      sharedBrands,
      status: "approved",
      updatedAt: FieldValue.serverTimestamp(),
    };

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

    // 🔥 Reusable sharing function
    const sharePosts = async (
      sourceCompanyId: string,
      targetCompanyId: string
    ) => {
      const snap = await db
        .collection("posts")
        .where("companyId", "==", sourceCompanyId)
        .where("migratedVisibility", "==", "network")
        .get();

      if (snap.empty) return;

      const batch = db.batch();

      snap.forEach((doc) => {
        const post = doc.data();

        const postBrands = (
          Array.isArray(post.brands)
            ? post.brands
            : Object.keys(post.brands || {})
        ).map(normalize);

        const matches = sharedBrandNames.some((b: string) =>
          postBrands.includes(b)
        );

        if (!matches) return;

        batch.update(doc.ref, {
          sharedWithCompanies: FieldValue.arrayUnion(targetCompanyId),
        });
      });

      await batch.commit();
    };

    // 🔹 Share both directions
    await Promise.all([
      sharePosts(requestFromCompanyId, requestToCompanyId),
      sharePosts(requestToCompanyId, requestFromCompanyId),
    ]);

    // 🔹 Increment usage
    await Promise.all([
      db
        .collection("companies")
        .doc(requestFromCompanyId)
        .update({
          "usage.connections": FieldValue.increment(1),
        }),
      db
        .collection("companies")
        .doc(requestToCompanyId)
        .update({
          "usage.connections": FieldValue.increment(1),
        }),
    ]);

    // 🔹 Audit log
    await db.collection("connectionHistory").add({
      event: "connection_approved",
      fromCompanyId: requestFromCompanyId,
      toCompanyId: requestToCompanyId,
      companyIds: [requestFromCompanyId, requestToCompanyId],
      sharedBrandNames,
      sharedBrands,
      brandCount: sharedBrands.length,
      timestamp: FieldValue.serverTimestamp(),
    });
  }
);
