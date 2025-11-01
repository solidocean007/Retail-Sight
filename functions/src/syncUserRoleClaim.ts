import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const syncUserRoleClaim = onDocumentWritten(
  {
    document: "users/{uid}",
    region: "us-central1",
    cpu: 1, // ✅ valid in Gen 2
    memory: "256MiB",
  },
  async (event) => {
    const uid = event.params.uid;
    const afterData = event.data?.after?.data();

    if (!afterData) {
      // User doc deleted → clear claims
      await admin.auth().setCustomUserClaims(uid, {});
      return;
    }

    const role = afterData.role || null;
    if (["admin", "super-admin", "developer"].includes(role)) {
      await admin.auth().setCustomUserClaims(uid, { role });
    } else {
      await admin.auth().setCustomUserClaims(uid, {}); // clear elevated claims
    }
  }
);
