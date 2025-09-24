import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const syncUserRoleClaim = functions.firestore
  .document("users/{uid}")
  .onWrite(async (change, context) => {
    const uid = context.params.uid;
    const afterData = change.after.exists ? change.after.data() : null;

    if (!afterData) {
      // User doc deleted → clear claims
      await admin.auth().setCustomUserClaims(uid, {});
      return;
    }

    const role = afterData.role || null;

    if (["admin", "super-admin", "developer"].includes(role)) {
      await admin.auth().setCustomUserClaims(uid, { role });
    } else {
      await admin.auth().setCustomUserClaims(uid, {}); // clears elevated claims
    }
  });
