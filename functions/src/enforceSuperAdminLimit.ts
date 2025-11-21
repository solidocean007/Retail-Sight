import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const enforceSuperAdminLimit = onCall(async (request) => {
  const { data, auth } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const { companyId, uid, newRole } = data;
  if (!companyId || !uid || !newRole) {
    throw new HttpsError(
      "invalid-argument",
      "companyId, uid, and newRole required."
    );
  }

  if (newRole !== "super-admin") {
    return { allowed: true };
  }

  const snapshot = await admin
    .firestore()
    .collection("users")
    .where("companyId", "==", companyId)
    .where("role", "==", "super-admin")
    .get();

  if (snapshot.size >= 3) {
    throw new HttpsError(
      "failed-precondition",
      "This company already has 3 super-admins."
    );
  }

  return { allowed: true };
});
