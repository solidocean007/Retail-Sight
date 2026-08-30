import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
const db = admin.firestore();

export const markAccessRequestComplete = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in is required.");
  }

  const { companyId, inviteId, inviteeEmail } = request.data || {};
  if (!companyId || !inviteId || !inviteeEmail) {
    throw new HttpsError("invalid-argument", "Missing request details.");
  }

  const authenticatedEmail = request.auth.token.email?.toLowerCase();
  if (
    !authenticatedEmail ||
    authenticatedEmail !== inviteeEmail.toLowerCase()
  ) {
    throw new HttpsError(
      "permission-denied",
      "This access request belongs to another email address."
    );
  }

  // Resolve the exact approved request, then verify its company and email.
  const snap = await db
    .collection("accessRequests")
    .where("inviteId", "==", inviteId)
    .limit(1)
    .get();

  if (snap.empty) {
    console.log(`No access request found for ${inviteeEmail}`);
    throw new HttpsError("not-found", "No matching access request.");
  }

  const requestDoc = snap.docs[0];
  const requestData = requestDoc.data();
  if (
    requestData.linkedCompanyId !== companyId ||
    requestData.workEmail?.toLowerCase() !== authenticatedEmail
  ) {
    throw new HttpsError(
      "permission-denied",
      "The access request does not match this invitation."
    );
  }

  const reqRef = requestDoc.ref;
  await reqRef.update({
    status: "completed",
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Marked access request completed for ${inviteeEmail}`);
  return { message: "Access request completed" };
});
