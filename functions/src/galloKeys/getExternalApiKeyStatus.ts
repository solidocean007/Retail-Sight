// functions/src/externalApiKeys.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const getExternalApiKeyStatus = onCall<{ integration: string }>(
  async (req) => {
    const uid = req.auth?.uid;
    if (!uid) {
      throw new Error("Not authenticated");
    }
    // look up companyId from users/{uid}
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const companyId = userSnap.data()?.companyId;
    if (!companyId) {
      throw new Error("Missing companyId");
    }

    const { integration } = req.data;
    if (integration !== "galloAxis") {
      throw new Error(`Unsupported integration: ${integration}`);
    }

    // 🔎 read metadata from companies/{companyId}/integrations/{integration}
    const docRef = admin
      .firestore()
      .doc(`companies/${companyId}/integrations/${integration}`);
    const snap = await docRef.get();

    if (!snap.exists) {
      return {
        prod: { exists: false },
        dev: { exists: false },
      };
    }

    const data = snap.data() || {};
    return {
      prod: {
        exists: !!data.prodKeyExists,
        lastFour: data.prodKeyLastFour ?? null,
        updatedAt: data.prodKeyUpdatedAt ?? null,
      },
      dev: {
        exists: !!data.devKeyExists,
        lastFour: data.devKeyLastFour ?? null,
        updatedAt: data.devKeyUpdatedAt ?? null,
      },
    };
  }
);
