import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { assertAccessRequestReviewer } from "./accessRequestSecurity";

const db = admin.firestore();

/**
 * approveAccessRequest
 * Called when an admin approves a pending access request.
 * - Marks company as verified
 * - Creates invite for requesting user
 * - Updates accessRequest and sends email
 */
export const approveAccessRequest = onCall(async (request) => {
  await assertAccessRequestReviewer(request.auth?.uid);

  const { requestId } = request.data || {};
  if (!requestId || typeof requestId !== "string") {
    throw new HttpsError("invalid-argument", "Missing requestId");
  }

  const reqRef = db.collection("accessRequests").doc(requestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) {
    throw new HttpsError("not-found", "Access request not found");
  }

  const planId = "free";

  const planSnap = await db.collection("plans").doc(planId).get();
  if (!planSnap.exists) {
    throw new Error(`Plan ${planId} not found`);
  }

  const plan = planSnap.data()!;

  const reqData = reqSnap.data() as {
    firstName: string;
    lastName: string;
    workEmail: string;
    companyName: string;
    normalizedName?: string;
    userTypeHint?: "supplier" | "distributor";
    userType?: "supplier" | "distributor";
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

  const companyType = reqData.userTypeHint || reqData.userType;
  if (!companyType) {
    throw new HttpsError(
      "failed-precondition",
      "The request is missing a company type."
    );
  }

  // Find an existing company. New workspaces are created only after approval.
  const existing = await db
    .collection("companies")
    .where("normalizedName", "==", normalizedName)
    .limit(1)
    .get();

  const companyDoc = existing.empty
    ? await (async () => {
        const companyRef = db.collection("companies").doc();
        await companyRef.set({
          companyName: reqData.companyName,
          normalizedName: reqData.normalizedName || normalizedName,
          companyType,
          verified: false,
          accessStatus: "off",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        const created = await companyRef.get();
        return created;
      })()
    : existing.docs[0];
  const companyId = companyDoc.id;

  // ✅ Mark company as verified and limited access
  await companyDoc.ref.update({
    verified: true,
    companyVerified: true,
    accessStatus: "limited", // system-level "active but onboarding" state
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    verifiedBy: request.auth!.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // add billing info to company
  await companyDoc.ref.update({
    billing: {
      plan: planId,
      paymentStatus: "inactive", // free but enforceable
      braintreeCustomerId: null,
      subscriptionId: null,
      renewalDate: null,
      totalMonthlyCost: 0,
    },
    limits: {
      userLimit: plan.userLimit,
      connectionLimit: plan.connectionLimit,
    },
  });

  // 📨 Create invite doc for first admin user
  const inviteRef = await db
    .collection("companies")
    .doc(companyId)
    .collection("invites")
    .add({
      inviteeEmail: reqData.workEmail,
      inviteeEmailLower: reqData.workEmail.toLowerCase(),
      firstName: reqData.firstName,
      lastName: reqData.lastName,
      role: "admin",
      companyId,
      companyName: reqData.companyName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ),
      createdBy: request.auth!.uid,
      accepted: false,
      status: "pending",
    });

  const inviteId = inviteRef.id;

  // ✅ Update the access request
  await reqRef.update({
    status: "approved-pending-user",
    approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    approvedBy: request.auth!.uid,
    linkedCompanyId: companyId,
    inviteId,
  });

  // 📨 Send invite email
  const appDomain = process.env.APP_DOMAIN || "https://displaygram.com";
  const inviteLink = `${appDomain}/accept-invite/${companyId}/${inviteId}`;

  await db.collection("mail").add({
    to: reqData.workEmail,
    category: "transactional",
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
