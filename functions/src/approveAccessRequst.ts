import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * approveAccessRequest
 * Called when an admin approves a pending access request.
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

  // 🧠 Prevent duplicate approvals
  if (reqData.status === "approved") {
    console.log(`⚠️ Request ${requestId} already approved.`);
    return { message: "Already approved", skip: true };
  }

  const normalizedName = reqData.companyName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  // 🏢 Ensure company exists or create one
  let companyId: string;
  const existing = await db
    .collection("companies")
    .where("normalizedName", "==", normalizedName)
    .limit(1)
    .get();

  if (!existing.empty) {
    companyId = existing.docs[0].id;
  } else {
    const newCompany = {
      name: reqData.companyName.trim(),
      normalizedName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: reqData.workEmail,
      type: reqData.userTypeHint,
      billing: {
        plan: "free",
        paymentStatus: "inactive",
        userLimit: 1,
        connectionLimit: 0,
      },
    };
    const docRef = await db.collection("companies").add(newCompany);
    companyId = docRef.id;
  }

  // 📨 Create invite doc inside the company
  const inviteData = {
    inviteeEmail: reqData.workEmail,
    role: "admin",
    companyId,
    companyName: reqData.companyName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: "system-approval",
    accepted: false,
    status: "approved-pending-user",
  };

  const inviteRef = await db
    .collection("companies")
    .doc(companyId)
    .collection("invites")
    .add(inviteData);
  const inviteId = inviteRef.id;

  // ✅ Update the access request status
  // ✅ Update the access request status to indicate pending user onboarding
  await reqRef.update({
    status: "approved-pending-user",
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: "system-admin",
    linkedCompanyId: companyId,
    inviteId,
  });

  // 📨 Send email with approval + invite link
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

  console.log(`✅ Access approved + invite sent to ${reqData.workEmail}`);
  return { message: "Access request approved", companyId, inviteId };
});
