import { onCall } from "firebase-functions/https";
import * as admin from "firebase-admin";
const db = admin.firestore();

export const markAccessRequestComplete = onCall(async (request) => {
  const { companyId, inviteeEmail } = request.data || {};
  if (!companyId || !inviteeEmail) throw new Error("Missing data");

  // Find access request for this company/email combo
  const snap = await db
    .collection("accessRequests")
    .where("workEmail", "==", inviteeEmail)
    .where("linkedCompanyId", "==", companyId)
    .limit(1)
    .get();

  if (snap.empty) {
    console.log(`No access request found for ${inviteeEmail}`);
    return { message: "No matching request" };
  }

  const reqRef = snap.docs[0].ref;
  await reqRef.update({
    status: "completed",
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Marked access request completed for ${inviteeEmail}`);
  return { message: "Access request completed" };
});
