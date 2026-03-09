import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { recomputeCompanyCountsInternal } from "./billing/recomputeCompanyCounts";
import { enforcePlanLimitsInternal } from "./billing/enforePlanLimitsInternal";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

type Patch = Partial<{
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  salesRouteNum: string | number | null;
  reportsTo: string;
  role: "employee" | "admin" | "super-admin" | "developer" | "supervisor";
  status: "active" | "inactive";
}>;

export const adminUpdateCompanyUser = onCall(async (request) => {
  if (!request.auth?.uid)
    throw new HttpsError("unauthenticated", "Auth required.");

  const { uid, patch } = request.data as {
    uid: string;
    patch: Patch;
  };

  if (typeof patch !== "object" || patch === null) {
    throw new HttpsError("invalid-argument", "Invalid patch.");
  }

  if (!uid || !patch)
    throw new HttpsError("invalid-argument", "Missing uid or patch.");

  const callerUid = request.auth.uid;

  const [callerSnap, targetSnap] = await Promise.all([
    db.doc(`users/${callerUid}`).get(),
    db.doc(`users/${uid}`).get(),
  ]);

  if (!callerSnap.exists)
    throw new HttpsError("permission-denied", "Caller not found.");
  if (!targetSnap.exists) throw new HttpsError("not-found", "User not found.");

  const caller = callerSnap.data()!;
  const target = targetSnap.data()!;

  if (!caller.companyId || caller.companyId !== target.companyId) {
    throw new HttpsError("permission-denied", "Not same company.");
  }

  if (!["admin", "super-admin", "developer"].includes(caller.role)) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }

  // prevent self-disable
  if (callerUid === uid && patch.status && patch.status !== "active") {
    throw new HttpsError(
      "failed-precondition",
      "You cannot deactivate yourself."
    );
  }

  const prevStatus = (target.status ?? "active") as "active" | "inactive";
  const nextStatus = (patch.status ?? prevStatus) as "active" | "inactive";

  if ("role" in patch) {
    if (patch.role === "developer" && caller.role !== "developer") {
      throw new HttpsError(
        "permission-denied",
        "Cannot assign developer role."
      );
    }
  }

  // allowlist fields only
  const update: any = {};
  if ("firstName" in patch) update.firstName = patch.firstName ?? null;
  if ("lastName" in patch) update.lastName = patch.lastName ?? null;
  if ("phone" in patch) update.phone = patch.phone ?? null;
  if ("salesRouteNum" in patch)
    update.salesRouteNum = patch.salesRouteNum ?? null;
  if ("reportsTo" in patch) update.reportsTo = patch.reportsTo ?? "";
  if ("role" in patch) update.role = patch.role;
  if ("status" in patch) update.status = nextStatus;

  update.lastUpdated = admin.firestore.FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await tx.get(userRef);
    const current = userSnap.data();

    const prevStatusTx = (current?.status ?? "active") as "active" | "inactive";

    if (prevStatusTx !== "active" && nextStatus === "active") {
      await recomputeCompanyCountsInternal(target.companyId);
      await enforcePlanLimitsInternal(target.companyId, "addUser");
    }

    tx.update(userRef, update);
  });

  await recomputeCompanyCountsInternal(target.companyId);

  return { success: true };
});
