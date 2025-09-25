// functions/src/galloAxisKeys.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const upsertGalloAxisKey = onCall<{ env: "prod" | "dev"; key: string }>(
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new Error("Not authenticated");
    }
    // 🔎 Lookup companyId
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const companyId = userSnap.data()?.companyId;
    if (!companyId) {
      throw new Error("Missing companyId");
    }

    const role = req.auth?.token?.role;
    if (role !== "developer" && role !== "super-admin") {
      throw new Error("Permission denied");
    }

    const { env, key } = req.data;
    if (!env || !key) {
      throw new Error("Missing env or key");
    }

    // Store full key in apiKeys (as you currently do)
    const apiKeysRef = admin.firestore().doc(`apiKeys/${companyId}`);
    const snap = await apiKeysRef.get();
    const data = snap.data() || {};
    const externalApiKeys = Array.isArray(data.externalApiKeys)
      ? data.externalApiKeys
      : [];
    const filtered = externalApiKeys.filter(
      (k: any) => k.name !== `galloApiKey${env === "prod" ? "Prod" : "Dev"}`
    );
    const updated = [
      ...filtered,
      { name: `galloApiKey${env === "prod" ? "Prod" : "Dev"}`, key },
    ];

    await apiKeysRef.set({ externalApiKeys: updated }, { merge: true });

    // Store status metadata in integrations/galloAxis
    await admin
      .firestore()
      .doc(`companies/${companyId}/integrations/galloAxis`)
      .set(
        {
          [`${env}KeyLastFour`]: key.slice(-4),
          [`${env}KeyUpdatedAt`]: admin.firestore.FieldValue.serverTimestamp(),
          [`${env}KeyExists`]: true,
        },
        { merge: true }
      );

    return { success: true };
  }
);
