// functions/src/galloKeys.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

type GetKeyData = {
  name: string; // e.g. "galloApiKey"
};

export const getExternalApiKey = onCall<GetKeyData>(async (request) => {
  const uid = request.auth?.uid;
  const companyId = request.auth?.token?.companyId;
  const role = request.auth?.token?.role;

  if (!uid || !companyId) {
    throw new Error("Not authenticated or missing companyId");
  }

  // optional: restrict who can read raw keys
  if (role !== "developer" && role !== "super-admin") {
    throw new Error("Permission denied");
  }

  const { name } = request.data;
  if (!name) throw new Error("Missing key name");

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
