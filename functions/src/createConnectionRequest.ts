// functions/createConnectionRequest.ts
import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";
import { enforcePlanLimitsInternal } from "./billing/enforePlanLimitsInternal";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const createConnectionRequest = onCall(async (request) => {
  const { fromCompanyId, toCompanyId, pendingBrands = [] } = request.data || {};

  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Auth required.");
  }

  const requestedByUid = request.auth.uid;

  const userSnap = await db.doc(`users/${requestedByUid}`).get();

  if (!userSnap.exists) {
    throw new HttpsError("permission-denied", "User not found.");
  }

  if (userSnap.data()?.companyId !== fromCompanyId) {
    throw new HttpsError("permission-denied", "User not in company.");
  }

  if (userSnap.data()?.companyId !== fromCompanyId) {
    throw new HttpsError("permission-denied", "User not in company.");
  }

  if (!fromCompanyId || !toCompanyId || !requestedByUid) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  // 🔍 Validate companies
  const [fromSnap, toSnap] = await Promise.all([
    db.collection("companies").doc(fromCompanyId).get(),
    db.collection("companies").doc(toCompanyId).get(),
  ]);

  if (!fromSnap.exists || !toSnap.exists) {
    throw new HttpsError("not-found", "One or both companies do not exist.");
  }

  // 🔁 Prevent duplicate connections
  const existing = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", fromCompanyId)
    .where("requestToCompanyId", "==", toCompanyId)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError("already-exists", "Connection already exists.");
  }

  // 🧮 Enforce connection limits
  const fromCompany = fromSnap.data()!;

  // BEFORE creating the connection
  await recomputeCompanyCountsInternal(fromCompanyId);
  await enforcePlanLimitsInternal(fromCompanyId, "addConnection");

  // 🧾 Create connection
  const ref = await db.collection("companyConnections").add({
    requestFromCompanyId: fromCompanyId,
    requestFromCompanyName: fromCompany.companyName,
    requestFromCompanyType: fromCompany.companyType,

    requestToCompanyId: toCompanyId,
    requestToCompanyName: toSnap.data()!.companyName,
    requestToCompanyType: toSnap.data()!.companyType,

    requestedByUid,
    status: "pending",
    pendingBrands,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    id: ref.id,
    status: "pending",
  };
});
