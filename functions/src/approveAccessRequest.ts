import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * approveAccessRequest
 * Called when an admin approves a pending access request.
 * - Marks company as verified
 * - Creates invite for requesting user
 * - Updates accessRequest and sends email
 */
export const approveAccessRequest = onCall(async (request) => {
  const { requestId } = request.data || {};
  if (!requestId) throw new Error("Missing requestId");

  const reqRef = db.collection("accessRequests").doc(requestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) throw new Error("Access request not found");

  const reqData = reqSnap.data() as {
    firstName: string;
    lastName: string;
    workEmail: string;
    companyName: string;
    userTypeHint: "supplier" | "distributor";
    status?: string;
  };

  // 🧠 Prevent double-approval
  if (reqData.status?.startsWith("approved")) {
    console.log(`⚠️ Request ${requestId} already approved.`);
    return { message: "Already approved", skip: true };
  }

  const normalizedName = reqData.companyName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  // 🏢 Find existing provisional company
  const existing = await db
    .collection("companies")
    .where("normalizedName", "==", normalizedName)
    .limit(1)
    .get();

  if (existing.empty) {
    throw new Error(`No provisional company found for ${reqData.companyName}`);
  }

  const companyDoc = existing.docs[0];
  const companyId = companyDoc.id;

  // ✅ Mark company as verified and limited access
  await companyDoc.ref.update({
    verified: true,
    companyVerified: true,
    accessStatus: "limited", // system-level "active but onboarding" state
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    verifiedBy: "system-admin",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // 📨 Create invite doc for first admin user
  const inviteRef = await db
    .collection("companies")
    .doc(companyId)
    .collection("invites")
    .add({
      inviteeEmail: reqData.workEmail,
      role: "admin",
      companyId,
      companyName: reqData.companyName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "system-approval",
      accepted: false,
      status: "approved-pending-user",
    });

  const inviteId = inviteRef.id;

  // ✅ Update the access request
  await reqRef.update({
    status: "approved-pending-user",
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: "system-admin",
    linkedCompanyId: companyId,
    inviteId,
  });

  // 📨 Send invite email
  const appDomain = process.env.APP_DOMAIN || "https://displaygram.com";
  const inviteLink = `${appDomain}/onboard-company/${companyId}/${inviteId}`;

  await db.collection("mail").add({
    to: reqData.workEmail,
    message: {
      subject: "🎉 Your Displaygram Access Has Been Approved",
      text: `Hi ${reqData.firstName},

Your request for "${reqData.companyName}" has been approved!

To finish setting up your account, click below:
${inviteLink}

This link will let you create your Displaygram login and join your company dashboard.

— Displaygram Support`,
    },
  });

  console.log(
    `✅ Access approved for ${reqData.companyName}, invite sent to ${reqData.workEmail}`
  );

  return { message: "Access request approved", companyId, inviteId };
});
