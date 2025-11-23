import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const db = admin.firestore();
import { HttpsError } from "firebase-functions/https";

export const acceptInviteAutoResolve = onCall(async (request) => {
  const { email, newCompanyId } = request.data;

  if (!email || !newCompanyId) {
    throw new HttpsError("invalid-argument", "Missing email or companyId");
  }

  const draftsSnap = await db
    .collection("companyConnectionDrafts")
    .where("targetEmail", "==", email.toLowerCase())
    .where("status", "==", "pending-user-creation")
    .get();

  if (draftsSnap.empty) return { ok: true, message: "No drafts found." };

  const batch = db.batch();

  draftsSnap.forEach((docSnap) => {
    const draft = docSnap.data();

    const newConnRef = db.collection("companyConnections").doc();

    batch.set(newConnRef, {
      initiatorCompanyId: draft.initiatorCompanyId,
      receiverCompanyId: newCompanyId,
      pendingBrands: draft.pendingBrands || [],
      sharedBrands: [],
      status: "pending",
      createdAt: new Date(),
    });

    batch.update(docSnap.ref, { status: "resolved", resolvedAt: new Date() });
  });

  await batch.commit();
  return { ok: true };
});
