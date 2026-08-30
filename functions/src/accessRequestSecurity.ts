import { HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/** Restrict access-request review actions to platform-level reviewers. */
export const assertAccessRequestReviewer = async (uid?: string) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in is required.");
  }

  const callerSnap = await db.collection("users").doc(uid).get();
  const role = callerSnap.data()?.role;

  if (!callerSnap.exists || !["developer", "super-admin"].includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "Only Displaygram reviewers can manage access requests."
    );
  }
};
