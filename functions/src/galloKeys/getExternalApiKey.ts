// functions/src/galloKeys.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

type GetKeyData = {
  name: string; // e.g. "galloApiKeyDev" or "galloApiKeyProd"
};

export const getExternalApiKey = onCall<GetKeyData>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new Error("Not authenticated");
  }

  // 🔎 Look up user doc in Firestore to get companyId
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  if (!userSnap.exists) {
    throw new Error(`User document not found for uid ${uid}`);
  }

  const companyId = userSnap.data()?.companyId;
  if (!companyId) {
    throw new Error("User missing companyId");
  }

  // ✅ Only allow super-admins and developers to fetch full keys
  const role = request.auth?.token?.role;
  if (role !== "developer" && role !== "super-admin") {
    throw new Error("Permission denied");
  }

  const { name } = request.data;
  if (!name) {
    throw new Error("Missing key name");
  }
  // 🔎 Pull from apiKeys/{companyId}
  const docRef = admin.firestore().doc(`apiKeys/${companyId}`);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error(`No apiKeys doc for company ${companyId}`);
  }

  const data = snap.data() || {};
  const externalKeys: Array<{ name: string; key: string }> =
    data.externalApiKeys || [];

  const match = externalKeys.find((k) => k.name === name);
  if (!match) {
    throw new Error(`Key ${name} not found for company ${companyId}`);
  }

  return { key: match.key };
});
