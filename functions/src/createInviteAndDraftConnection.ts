import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const createInviteAndDraftConnection = onCall(async (request) => {
  try {
    const data = request.data || {};
    const { targetEmail, fromCompanyId, sharedBrands = [] } = data;

    if (!targetEmail || !fromCompanyId) {
      throw new Error("Missing required fields: targetEmail, fromCompanyId");
    }

    const cleanEmail = String(targetEmail).trim().toLowerCase();

    // Get inviting company details
    const invitingCompanySnap = await db
      .collection("companies")
      .doc(fromCompanyId)
      .get();

    if (!invitingCompanySnap.exists) {
      throw new Error("Inviting company does not exist.");
    }

    const invitingCompany = invitingCompanySnap.data();
    const fromCompanyType = invitingCompany?.companyType; // "distributor" | "supplier"

    // 1️⃣ Create pendingInvite
    const inviteRef = await db.collection("pendingInvites").add({
      email: cleanEmail,
      fromCompanyId,
      fromCompanyType,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2️⃣ Create draft connection for shared brands
    const draftConnectionRef = await db
      .collection("companyConnectionDrafts")
      .add({
        targetEmail: cleanEmail,
        fromCompanyId,
        pendingBrands: sharedBrands,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        inviteId: inviteRef.id,
      });

    return {
      inviteId: inviteRef.id,
      draftId: draftConnectionRef.id,
    };
  } catch (err: any) {
    console.error("Error in createInviteAndDraftConnection:", err);
    throw new Error(err.message || "Internal error occurred.");
  }
});
