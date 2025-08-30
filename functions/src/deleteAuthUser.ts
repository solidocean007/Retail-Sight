import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const deleteAuthUser = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  const targetUid: string | undefined = request.data?.uid;

  if (!callerUid || !targetUid) {
    throw new HttpsError(
      "unauthenticated",
      "Authentication required and target uid must be provided."
    );
  }

  const callerSnap = await db.collection("users").doc(callerUid).get();
  const caller = callerSnap.data();
  if (!caller) {
    throw new HttpsError("not-found", "Caller user record not found.");
  }

  const canHardDelete =
    caller.role === "super-admin" || caller.role === "developer";

  // Soft delete first
  const userRef = db.collection("users").doc(targetUid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    await userRef.update({ status: "deleted" });
  }

  let mode: "soft" | "hard" = "soft";

  if (canHardDelete) {
    // Try deleting from Auth, but be idempotent
    try {
      await admin.auth().deleteUser(targetUid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // ignore "user not found" cases
      if (!/no user record|user-not-found/i.test(msg)) {
        throw new HttpsError(
          "internal",
          "Failed to delete user from Firebase Auth.",
          msg
        );
      }
    }

    // Delete Firestore user doc if it still exists
    const afterAuthSnap = await userRef.get();
    if (afterAuthSnap.exists) {
      await userRef.delete();
    }

    mode = "hard";
  }

  // 🔎 Audit log (keep for compliance / traceability)
  await db.collection("auditLogs").add({
    ts: admin.firestore.FieldValue.serverTimestamp(),
    action: mode === "hard" ? "user.hardDelete" : "user.softDelete",
    actorUid: callerUid,
    actorRole: caller.role,
    targetUid,
    companyId: caller.companyId ?? null,
  });

  return {
    status: "success",
    deleted: mode,
    message:
      mode === "hard"
        ? "User was permanently deleted."
        : "User was marked as deleted.",
  };
});
