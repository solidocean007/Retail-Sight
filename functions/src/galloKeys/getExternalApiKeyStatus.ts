// functions/src/externalApiKeys.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const getExternalApiKeyStatus = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Not authenticated");

  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const companyId = userSnap.data()?.companyId;

  const apiKeysRef = admin.firestore().doc(`apiKeys/${companyId}`);
  const snap = await apiKeysRef.get();
  const gallo = snap.data()?.gallo || {};

  return {
    prod: {
      exists: !!gallo.prodKey,
      lastFour: gallo.prodKey ? gallo.prodKey.slice(-4) : null,
      updatedAt: gallo.prodUpdatedAt || null,
    },
    dev: {
      exists: !!gallo.devKey,
      lastFour: gallo.devKey ? gallo.devKey.slice(-4) : null,
      updatedAt: gallo.devUpdatedAt || null,
    },
  };
});
