import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { assertAccessRequestReviewer } from "./accessRequestSecurity";

const db = admin.firestore();

/**
 * rejectAccessRequest
 * Called when an admin rejects a pending access request.
 * Updates status and sends polite rejection email.
 */
export const rejectAccessRequest = onCall(async (request) => {
  await assertAccessRequestReviewer(request.auth?.uid);

  const { requestId } = request.data || {};
  if (!requestId || typeof requestId !== "string") {
    throw new HttpsError("invalid-argument", "Missing requestId");
  }

  const reqRef = db.collection("accessRequests").doc(requestId);
  const snap = await reqRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Access request not found");
  }

  const data = snap.data() as {
    firstName: string;
    lastName: string;
    workEmail: string;
    companyName: string;
    status?: string;
  };

  if (data.status === "rejected") {
    console.log(`⚠️ Request ${requestId} already rejected.`);
    return { message: "Already rejected" };
  }

  // 1️⃣ Update accessRequest status
  await reqRef.update({
    status: "rejected",
    rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
    rejectedBy: request.auth!.uid,
  });

  // 2️⃣ Write email to Firestore mail collection
  const appDomain = process.env.APP_DOMAIN || "https://displaygram.com";
  await db.collection("mail").add({
    to: data.workEmail,
    category: "transactional",
    message: {
      subject: `Update on your Displaygram request for "${data.companyName}"`,
      text: `Hi ${data.firstName},

Thank you for your interest in Displaygram.

Your request for "${data.companyName}" has been reviewed, but unfortunately
 it wasn’t approved at this time.

If you believe this was an error or want to reapply, please reach out to support at:
${appDomain}/contact

Best regards,  
Displaygram Support`,
    },
  });

  console.log(`❌ Access request ${requestId} marked rejected. Email queued.`);
  return { message: "Request rejected and email queued." };
});
