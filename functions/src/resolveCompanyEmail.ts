import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v2";

const db = getFirestore();

export const resolveCompanyEmail = onCall(async (request) => {
  const { requestedEmail } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be logged in"
    );
  }

  const fromUid = auth.uid;
  const fromUserSnap = await db.collection("users").doc(fromUid).get();
  const fromUser = fromUserSnap.data();

  if (!fromUser || !fromUser.companyId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Your user record is missing a companyId"
    );
  }

  // 🔹 Target company
  const targetSnap = await db
    .collection("users")
    .where("email", "==", requestedEmail.toLowerCase())
    .limit(1)
    .get();

  if (targetSnap.empty) {
    throw new functions.https.HttpsError(
      "not-found",
      "No user found with that email"
    );
  }

  const targetUser = targetSnap.docs[0].data();

  if (!targetUser.companyId) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Target user is missing a companyId"
    );
  }

  if (!["admin", "super-admin"].includes(targetUser.role)) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Target user must be an admin or super-admin"
    );
  }

  const fromCompanyId = fromUser.companyId;
  const toCompanyId = targetUser.companyId;

  // 🔍 Duplicate check
  const dupSnap = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", fromCompanyId)
    .where("requestToCompanyId", "==", toCompanyId)
    .limit(1)
    .get();

  if (!dupSnap.empty) {
    throw new functions.https.HttpsError(
      "already-exists",
      "A connection or request between these companies already exists"
    );
  }

  const reverseDupSnap = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", toCompanyId)
    .where("requestToCompanyId", "==", fromCompanyId)
    .limit(1)
    .get();

  if (!reverseDupSnap.empty) {
    throw new functions.https.HttpsError(
      "already-exists",
      "A connection between these companies already exists"
    );
  }

  return {
    success: true,
    toCompanyId,
    toCompanyType: targetUser.companyType,
    toCompanyName: targetUser.companyName ?? null,
  };
});
