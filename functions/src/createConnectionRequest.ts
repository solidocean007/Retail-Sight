// functions/createConnectionRequest.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

export const createConnectionRequest = onCall(async (request) => {
  const {
    fromCompanyId,
    toCompanyId,
    pendingBrands = [],
    requestedByUid,
  } = request.data || {};

  if (!fromCompanyId || !toCompanyId || !requestedByUid) {
    throw new Error("Missing required fields.");
  }

  if (fromCompanyId === toCompanyId) {
    throw new Error("Cannot connect a company to itself.");
  }

  // 🔍 Validate companies
  const [fromSnap, toSnap] = await Promise.all([
    db.collection("companies").doc(fromCompanyId).get(),
    db.collection("companies").doc(toCompanyId).get(),
  ]);

  if (!fromSnap.exists || !toSnap.exists) {
    throw new Error("One or both companies do not exist.");
  }

  // 🔁 Prevent duplicate connections
  const existing = await db
    .collection("companyConnections")
    .where("requestFromCompanyId", "==", fromCompanyId)
    .where("requestToCompanyId", "==", toCompanyId)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error("Connection already exists.");
  }

  // 🧮 Enforce connection limits
  const fromCompany = fromSnap.data()!;
  const planLimit = fromCompany?.limits?.connectionLimit ?? 0;
  const addon = fromCompany?.billing?.addons?.extraConnection ?? 0;
  const used = fromCompany?.usage?.connections ?? 0;

  if (used >= planLimit + addon) {
    throw new Error("Connection limit reached.");
  }

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
