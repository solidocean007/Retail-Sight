import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v2";

const db = getFirestore();

export const resolveCompanyEmail = onCall(async (request) => {
  const { requestedEmail } = request.data;
  const auth = request.auth;
  if (!auth)
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be logged in"
    );

  const fromUid = auth.uid;
  const fromUserSnap = await db.collection("users").doc(fromUid).get();
  const fromUser = fromUserSnap.data();

  if (!fromUser?.companyId)
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Your user record is missing a companyId"
    );

  // 🔹 Target company lookup
  const targetSnap = await db
    .collection("users")
    .where("email", "==", requestedEmail.toLowerCase())
    .limit(1)
    .get();

  if (targetSnap.empty)
    throw new functions.https.HttpsError(
      "not-found",
      "No user found with that email"
    );

  const targetUser = targetSnap.docs[0].data();

  if (!targetUser.companyId)
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Target user is missing a companyId"
    );

  if (!["admin", "super-admin"].includes(targetUser.role))
    throw new functions.https.HttpsError(
      "permission-denied",
      "Target user must be an admin or super-admin"
    );

  const fromCompanyId = fromUser.companyId;
  const toCompanyId = targetUser.companyId;

  // 🔍 Duplicate checks
  const dup1 = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", fromCompanyId)
    .where("requestToCompanyId", "==", toCompanyId)
    .limit(1)
    .get();
  const dup2 = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", toCompanyId)
    .where("requestToCompanyId", "==", fromCompanyId)
    .limit(1)
    .get();

  if (!dup1.empty || !dup2.empty)
    throw new functions.https.HttpsError(
      "already-exists",
      "A connection already exists between these companies."
    );

  // 🧩 Enforce connection limit
  const companyRef = db.collection("companies").doc(fromCompanyId);
  const companySnap = await companyRef.get();
  const companyData = companySnap.data();

  if (!companyData)
    throw new functions.https.HttpsError("not-found", "Company not found.");

  const planId = companyData.billing?.plan;
  const planSnap = await db.collection("plans").doc(planId).get();
  const planData = planSnap.exists ? planSnap.data() : {};
  const baseLimit = planData?.connectionLimit ?? 0;
  const extra = companyData.billing?.addons?.extraConnection ?? 0;

  const sent = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", fromCompanyId)
    .where("status", "==", "approved")
    .get();
  const received = await db
    .collection("companyConnections")
    .where("requestToCompanyId", "==", fromCompanyId)
    .where("status", "==", "approved")
    .get();

  const usedConnections = sent.size + received.size;
  const allowedConnections = baseLimit + extra;

  if (usedConnections >= allowedConnections) {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `You’ve reached your connection limit (${allowedConnections}). Upgrade to add more.`
    );
  }

  return {
    success: true,
    toCompanyId,
    toCompanyType: targetUser.companyType,
    toCompanyName: targetUser.companyName ?? null,
  };
});
