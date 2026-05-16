import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const db = getFirestore();

const cleanStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

const normalize = (value: string) =>
  String(value || "")
    .trim()
    .toUpperCase();

/**
 * Trigger: companyConnections/{connectionId}
 * Purpose:
 *  1. Mirror approved connection into each company's subcollection
 *  2. Retroactively share posts between companies based on sharedBrandIds/sharedBrandNames
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
      sharedBrandIds = [],
      sharedBrandNames = [],
    } = after;

    if (!requestFromCompanyId || !requestToCompanyId) {
      console.warn("Missing company IDs on approved connection", {
        connectionId: event.params.connectionId,
        requestFromCompanyId,
        requestToCompanyId,
      });
      return;
    }

    const connectionId = event.params.connectionId;

    const cleanSharedBrandIds = cleanStringArray(sharedBrandIds);
    const cleanSharedBrandNames = cleanStringArray(sharedBrandNames);

    const targetBrandIds = new Set(cleanSharedBrandIds);
    const targetBrandNames = new Set(cleanSharedBrandNames.map(normalize));

    // 🔹 Mirror connection
    const connDoc = {
      connectionId,
      sharedBrandIds: cleanSharedBrandIds,
      sharedBrandNames: cleanSharedBrandNames,
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
      let updateCount = 0;

      snap.forEach((docSnap) => {
        const post = docSnap.data();

        const postBrandIds = Array.isArray(post.brandIds)
          ? post.brandIds.map((id: string) => String(id || "").trim())
          : [];

        const postBrandNames = (
          Array.isArray(post.brands)
            ? post.brands
            : Object.keys(post.brands || {})
        ).map(normalize);

        const idMatch =
          targetBrandIds.size > 0 &&
          postBrandIds.some((id: string) => targetBrandIds.has(id));

        const nameMatch =
          targetBrandNames.size > 0 &&
          postBrandNames.some((name: string) => targetBrandNames.has(name));

        if (!idMatch && !nameMatch) return;

        batch.update(docSnap.ref, {
          sharedWithCompanies: FieldValue.arrayUnion(targetCompanyId),
        });

        updateCount += 1;
      });

      if (updateCount === 0) {
        console.log("No posts matched approved connection brands", {
          connectionId,
          sourceCompanyId,
          targetCompanyId,
        });
        return;
      }

      await batch.commit();

      console.log("Shared posts after connection approval", {
        connectionId,
        sourceCompanyId,
        targetCompanyId,
        updateCount,
      });
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
      connectionId,
      fromCompanyId: requestFromCompanyId,
      toCompanyId: requestToCompanyId,
      companyIds: [requestFromCompanyId, requestToCompanyId],
      sharedBrandIds: cleanSharedBrandIds,
      sharedBrandNames: cleanSharedBrandNames,
      brandCount: cleanSharedBrandIds.length || cleanSharedBrandNames.length,
      timestamp: FieldValue.serverTimestamp(),
    });
  }
);
