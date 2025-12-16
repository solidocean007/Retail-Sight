// functions/src/galloAxisKeys.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const upsertGalloAxisKey = onCall<{
  env: "prod" | "dev";
  key: string;
  orgCode?: string;
}>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Not authenticated");

  // Look up company
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const companyId = userSnap.data()?.companyId;
  if (!companyId) throw new Error("Missing companyId");

  // Permissions
  const role = req.auth?.token?.role;
  if (role !== "developer" && role !== "super-admin" && role !== "admin") {
    throw new Error("Permission denied");
  }

  const { env, key, orgCode } = req.data;
  if (!env || !key) throw new Error("Missing env or key");

  // 🔥 Write into apiKeys/{companyId}.gallo
  const apiKeysRef = admin.firestore().doc(`apiKeys/${companyId}`);
  const snap = await apiKeysRef.get();
  const data = snap.data() || {};
  const gallo = data.gallo || {};

  // determine which key to update
  const updatedGallo: any = { ...gallo };

  if (env === "dev") {
    updatedGallo.devKey = key;
    updatedGallo.devUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
  } else {
    updatedGallo.prodKey = key;
    updatedGallo.prodUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  // allow updating orgCode here if provided
  if (orgCode) {
    updatedGallo.orgCode = orgCode;
  }

  await apiKeysRef.set({ gallo: updatedGallo }, { merge: true });

  // OPTIONAL: enable integration automatically
  await admin
    .firestore()
    .doc(`companies/${companyId}/integrations/galloAxis`)
    .set({ enabled: true }, { merge: true });

  return { success: true };
});
