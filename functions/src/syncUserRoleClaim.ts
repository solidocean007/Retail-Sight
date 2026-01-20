import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * syncUserRoleClaim
 * Mirrors Firestore user role → Firebase Auth custom claims (authoritative)
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

    // User deleted → clear claims
    if (!after) {
      await admin.auth().setCustomUserClaims(uid, {});
      return;
    }

    const role = after.role ?? "employee";
    const companyId = after.companyId ?? null;

    // 🔑 SINGLE SOURCE OF TRUTH
    await admin.auth().setCustomUserClaims(uid, {
      role,
      companyId,
    });

    console.log("🔄 Synced user claims", { uid, role, companyId });
  }
);
