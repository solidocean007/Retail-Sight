// functions/src/galloAxisKeys.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const deleteGalloAxisKey = onCall<{ env: "prod" | "dev" }>(
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new Error("Not authenticated");
    }

    // 🔎 lookup companyId
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const companyId = userSnap.data()?.companyId;
    if (!companyId) {
      throw new Error("Missing companyId");
    }

    const role = req.auth?.token?.role;
    if (role !== "developer" && role !== "super-admin") {
      throw new Error("Permission denied");
    }

    const { env } = req.data;
    if (!env) {
      throw new Error("Missing env");
    }
    // Remove from apiKeys/{companyId}
    const apiKeysRef = admin.firestore().doc(`apiKeys/${companyId}`);
    const snap = await apiKeysRef.get();
    if (snap.exists) {
      const data = snap.data() || {};
      const externalApiKeys = Array.isArray(data.externalApiKeys)
        ? data.externalApiKeys
        : [];
      const filtered = externalApiKeys.filter(
        (k: { name: string }) =>
          k.name !== `galloApiKey${env === "prod" ? "Prod" : "Dev"}`
      );
      await apiKeysRef.set({ externalApiKeys: filtered }, { merge: true });
    }

    // Update status doc to mark as deleted
    await admin
      .firestore()
      .doc(`companies/${companyId}/integrations/galloAxis`)
      .set(
        {
          [`${env}KeyExists`]: false,
          [`${env}KeyLastFour`]: null,
          [`${env}KeyUpdatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return { success: true };
  }
);
