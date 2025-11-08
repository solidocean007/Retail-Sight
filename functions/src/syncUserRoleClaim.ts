import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * syncUserRoleClaim
 * Keeps Firebase Auth custom claims in sync with Firestore user role.
 */
export const syncUserRoleClaim = onDocumentWritten(
  {
    region: "us-central1",
    document: "users/{uid}",
    cpu: 1,
    memory: "256MiB",
  },
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after?.data();

    // 🧹 If user was deleted
    if (!after) {
      await admin.auth().setCustomUserClaims(uid, {});
      return;
    }

    // 🧩 Read role safely
    const role = after.role || null;

    if (["admin", "super-admin", "developer"].includes(role)) {
      await admin.auth().setCustomUserClaims(uid, { role });
      console.log(`✅ Synced elevated claim for ${uid}: ${role}`);
    } else {
      // Clear elevated claims for regular users
      await admin.auth().setCustomUserClaims(uid, {});
      console.log(`ℹ️ Cleared custom claims for ${uid}`);
    }
  }
);
