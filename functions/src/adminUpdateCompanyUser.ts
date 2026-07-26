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

  // ------------------------------------------------------------------
  // Release this user's direct reports if they can no longer supervise.
  //
  // Without this, demoting or deactivating a supervisor silently orphans
  // everyone pointing at them: the reports keep a `reportsTo` aimed at
  // someone who isn't a supervisor anymore. Those users then vanish from
  // team views while still carrying a stale pointer, and anything that
  // walks `reportsTo` — notification routing, follow-ups — sends to a
  // person who no longer holds the role.
  //
  // Reports are CLEARED, not re-parented. Nothing here knows who should
  // cover that team, and guessing wrong silently is worse than surfacing
  // them as Unassigned for a human to place.
  // ------------------------------------------------------------------
  const SUPERVISOR_CAPABLE = ["supervisor", "admin", "super-admin"];

  const prevRole = String(target.role ?? "");
  const nextRole = String(patch.role ?? prevRole);

  const couldSupervise =
    SUPERVISOR_CAPABLE.includes(prevRole) && prevStatus === "active";
  const canStillSupervise =
    SUPERVISOR_CAPABLE.includes(nextRole) && nextStatus === "active";

  if (couldSupervise && !canStillSupervise) {
    try {
      const reportsSnap = await db
        .collection("users")
        .where("companyId", "==", target.companyId)
        .where("reportsTo", "==", uid)
        .get();

      if (!reportsSnap.empty) {
        const batch = db.batch();

        reportsSnap.docs.forEach((d) => {
          batch.update(d.ref, {
            reportsTo: "",
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        await batch.commit();

        await db.collection(`companies/${target.companyId}/auditLogs`).add({
          type: "reportsTo_released",
          reason: canStillSupervise ? "role_change" : `${prevRole}→${nextRole}`,
          actorUid: callerUid,
          formerSupervisorUid: uid,
          releasedUserUids: reportsSnap.docs.map((d) => d.id),
          releasedCount: reportsSnap.size,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      // The user update already committed — a cleanup failure must not
      // surface as "the role change failed", or an admin will retry and
      // get confusing results.
      console.error("Failed to release direct reports for", uid, err);
    }
  }

  await recomputeCompanyCountsInternal(target.companyId);

  return { success: true };
});
