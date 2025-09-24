// functions/enforceSuperAdminLimit.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const enforceSuperAdminLimit = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be signed in."
      );
    }

    const { companyId, uid, newRole } = data;
    if (!companyId || !uid || !newRole) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "companyId, uid, and newRole required."
      );
    }

    // if not promoting to super-admin, allow
    if (newRole !== "super-admin") {
      return { allowed: true };
    }

    // count existing super-admins
    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("companyId", "==", companyId)
      .where("role", "==", "super-admin")
      .get();

    if (snapshot.size >= 2) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "This company already has 2 super-admins."
      );
    }

    return { allowed: true };
  }
);
