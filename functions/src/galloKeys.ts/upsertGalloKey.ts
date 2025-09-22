// functions/src/galloKeys.ts
import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

type UpsertKeyData = {
  env: "prod" | "dev";
  key: string;
};

export const upsertGalloKey = onCall<UpsertKeyData>(async (request) => {
  try {
    const uid = request.auth?.uid;
    const role = request.auth?.token?.role;

    if (!uid || (role !== "developer" && role !== "super-admin")) {
      throw new Error("Permission denied");
    }

    const { env, key } = request.data;
    if (!env || !key) {
      throw new Error("Missing env or key");
    }

    const companyId = request.auth?.token?.companyId;
    if (!companyId) {
      throw new Error("Missing companyId");
    }

    // Write metadata to company doc
    const docRef = admin.firestore().doc(`companies/${companyId}/integrations/gallo`);
    await docRef.set(
      {
        [`${env}KeyLastFour`]: key.slice(-4),
        [`${env}KeyUpdatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Store full key in a separate locked collection
    await admin.firestore().collection("galloKeys").doc(`${companyId}_${env}`).set({ key });

    logger.info(`✅ ${env} key upserted for company ${companyId}`);
    return { success: true };
  } catch (err) {
    logger.error("upsertGalloKey error", err);
    throw new Error((err as Error).message);
  }
});
