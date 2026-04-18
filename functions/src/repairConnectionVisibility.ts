// functions/src/repairConnectionVisibility.ts

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const repairConnectionVisibility = onCall(async (request) => {
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Login required.");
  }

  const role = auth.token.role;

  if (role !== "developer" && role !== "super-admin") {
    throw new HttpsError("permission-denied", "Developer only.");
  }

  const { connectionId } = request.data;

  if (!connectionId) {
    throw new HttpsError("invalid-argument", "Missing connectionId");
  }

  const connRef = db.collection("companyConnections").doc(connectionId);
  const connSnap = await connRef.get();

  if (!connSnap.exists) {
    throw new HttpsError("not-found", "Connection not found.");
  }

  const connection = connSnap.data()!;

  const fromCompanyId = connection.requestFromCompanyId;
  const toCompanyId = connection.requestToCompanyId;

  const normalize = (s: string) => s.trim().toUpperCase();

  const sharedBrandNames: string[] = (connection.sharedBrandNames || []).map(
    normalize
  );

  const syncDirection = async (
    sourceCompanyId: string,
    targetCompanyId: string
  ) => {
    const postsSnap = await db
      .collection("posts")
      .where("companyId", "==", sourceCompanyId)
      .where("migratedVisibility", "==", "network")
      .get();

    if (postsSnap.empty) return 0;

    const batch = db.batch();
    let touched = 0;

    postsSnap.forEach((doc) => {
      const post = doc.data();

      const postBrands = (
        Array.isArray(post.brands)
          ? post.brands
          : Object.keys(post.brands || {})
      ).map(normalize);

      const shouldShare = sharedBrandNames.some((b) => postBrands.includes(b));

      batch.update(doc.ref, {
        sharedWithCompanies: shouldShare
          ? admin.firestore.FieldValue.arrayUnion(targetCompanyId)
          : admin.firestore.FieldValue.arrayRemove(targetCompanyId),
      });

      touched++;
    });

    await batch.commit();
    return touched;
  };

  const [a, b] = await Promise.all([
    syncDirection(fromCompanyId, toCompanyId),
    syncDirection(toCompanyId, fromCompanyId),
  ]);

  await db.collection("connectionHistory").add({
    event: "connection_visibility_repaired",
    connectionId,
    fromCompanyId,
    toCompanyId,
    sharedBrandNames,
    touchedPosts: a + b,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    connectionId,
    touchedPosts: a + b,
  };
});
