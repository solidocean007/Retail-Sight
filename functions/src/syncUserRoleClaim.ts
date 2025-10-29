import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

export const syncUserRoleClaim = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const after = event.data?.after?.data();
    const uid = event.params.uid;

    if (!after) {
      // user deleted — clear custom claims
      await admin.auth().setCustomUserClaims(uid, {});
      return;
    }

    const role = after.role || null;

    if (["admin", "super-admin", "developer"].includes(role)) {
      await admin.auth().setCustomUserClaims(uid, { role });
    } else {
      await admin.auth().setCustomUserClaims(uid, {});
    }
  }
);
