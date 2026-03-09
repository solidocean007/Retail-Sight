import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";
import { enforcePlanLimitsInternal } from "./billing/enforePlanLimitsInternal";

const db = admin.firestore();

export const acceptInviteAutoResolve = onCall(async (request) => {
  const { email, newCompanyId } = request.data;

  if (!email || !newCompanyId) {
    throw new HttpsError("invalid-argument", "Missing email or companyId");
  }

  //
  // 🔐 PRE-ENFORCEMENT
  //
  await recomputeCompanyCountsInternal(newCompanyId);
  await enforcePlanLimitsInternal(newCompanyId, "addConnection");

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
      requestFromCompanyId: draft.initiatorCompanyId,
      requestToCompanyId: newCompanyId,
      pendingBrands: draft.pendingBrands || [],
      sharedBrands: [],
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    batch.update(docSnap.ref, {
      status: "resolved",
      resolvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  //
  // 🔁 POST-RECOMPUTE
  //
  await recomputeCompanyCountsInternal(newCompanyId);

  return { ok: true };
});
