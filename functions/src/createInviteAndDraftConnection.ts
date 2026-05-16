import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { enforcePlanLimitsInternal } from "./billing/enforePlanLimitsInternal";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const cleanStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

export const createInviteAndDraftConnection = onCall(async (request) => {
  try {
    const data = request.data || {};

    const {
      targetEmail,
      fromCompanyId,
      sharedBrandIds = [],
      sharedBrandNames = [],
    } = data;

    if (!targetEmail || !fromCompanyId) {
      throw new Error("Missing required fields: targetEmail, fromCompanyId");
    }

    const cleanEmail = String(targetEmail).trim().toLowerCase();

    await recomputeCompanyCountsInternal(fromCompanyId);
    await enforcePlanLimitsInternal(fromCompanyId, "addConnection");

    const invitingCompanySnap = await db
      .collection("companies")
      .doc(fromCompanyId)
      .get();

    if (!invitingCompanySnap.exists) {
      throw new Error("Inviting company does not exist.");
    }

    const invitingCompany = invitingCompanySnap.data();
    const fromCompanyType = invitingCompany?.companyType;

    const cleanBrandIds = Array.from(new Set(cleanStringArray(sharedBrandIds)));

    const cleanBrandNames = Array.from(
      new Set(cleanStringArray(sharedBrandNames))
    );

    const inviteRef = await db.collection("pendingInvites").add({
      email: cleanEmail,
      fromCompanyId,
      fromCompanyType,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const draftRef = await db.collection("companyConnectionDrafts").add({
      targetEmail: cleanEmail,
      initiatorCompanyId: fromCompanyId,

      sharedBrandIds: cleanBrandIds,
      sharedBrandNames: cleanBrandNames,

      pendingBrandIds: cleanBrandIds,
      pendingBrandNames: cleanBrandNames,

      companyIds: [fromCompanyId],

      status: "pending-user-creation",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      inviteId: inviteRef.id,
    });

    return {
      inviteId: inviteRef.id,
      draftId: draftRef.id,
    };
  } catch (err: any) {
    console.error("Error in createInviteAndDraftConnection:", err);
    throw new Error(err.message || "Internal error occurred.");
  }
});
