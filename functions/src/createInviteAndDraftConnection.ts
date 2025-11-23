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

    // Create invite
    const inviteRef = await db.collection("pendingInvites").add({
      email: cleanEmail,
      fromCompanyId,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Normalize sharedBrands → pendingBrands format
    const pendingBrands = sharedBrands; // already structured

    // Create draft connection
    const draftConnection = await db.collection("companyConnectionDrafts").add({
      targetEmail: cleanEmail,
      fromCompanyId,
      pendingBrands,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { inviteId: inviteRef.id, draftId: draftConnection.id };
  } catch (err: any) {
    console.error("Error in createInviteAndDraftConnection: ", err);
    throw new Error(err.message || "Internal error occurred.");
  }
});
