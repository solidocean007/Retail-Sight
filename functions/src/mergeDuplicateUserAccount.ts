import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

type MergePayload = {
  originalEmail: string;
  duplicateEmail: string;
  /**
   * Set when the caller has already manually deleted the duplicate Auth
   * account themselves (e.g. via the Firebase console) before running this.
   * Without this flag, a missing duplicate account is treated as a likely
   * typo and rejected — we don't want to silently "succeed" just because
   * the email doesn't resolve to anything.
   */
  confirmNoExistingDuplicate?: boolean;
};

/**
 * mergeDuplicateUserAccount
 *
 * Fixes the "existing employee got a new email and Firebase auto-created a
 * second, disconnected Auth account" problem. `signInWithPopup` +
 * GoogleAuthProvider auto-provisions a brand-new Auth account on first use
 * of ANY Google email (see LoginForm.tsx handleGoogle) — there's no gate
 * tying that to an invite, so an existing employee who starts using a new
 * work email lands on a second, companyless account instead of their real
 * one.
 *
 * Rather than migrating any Firestore history (posts, comments, goal
 * reports, etc. are all keyed off the ORIGINAL uid), this reassigns the new
 * email onto the original account and removes the duplicate:
 *
 *   1. Verify the "duplicate" account is genuinely unclaimed (no Firestore
 *      user doc with a companyId) — refuses to touch anything that looks
 *      like a real second account belonging to someone else.
 *   2. Delete the duplicate Auth account, freeing up its email. If it's
 *      already gone (e.g. an admin deleted it by hand via the Firebase
 *      console before finding this tool), this step is skipped — but only
 *      after the caller explicitly confirms via `confirmNoExistingDuplicate`,
 *      so a plain typo in the duplicate email can't silently no-op.
 *   3. Move the freed email onto the original Auth account.
 *   4. Update the original Firestore user doc's email field to match.
 *   5. Audit-log the merge (this is a destructive, security-sensitive op).
 *
 * The user keeps signing in as the original account/uid. If they'd been
 * using Google on the new email, next "Continue with Google" attempt will
 * throw auth/account-exists-with-different-credential — LoginForm.tsx
 * already handles that by prompting a password sign-in and auto-linking
 * the Google credential afterward.
 *
 * Known limitation: steps 1-4 are not one atomic transaction (Auth account
 * operations can't participate in a Firestore transaction). If step 3
 * throws after step 1 has already deleted the duplicate account, re-running
 * this function will fail with "no account found for duplicateEmail" even
 * though the merge didn't finish — in that case the original account still
 * has its old email and needs `admin.auth().updateUser(originalUid, {
 * email: duplicateEmail })` applied by hand (uid is in the thrown error).
 */
export const mergeDuplicateUserAccount = onCall<MergePayload>(
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Auth required.");
    }

    const originalEmail = (request.data?.originalEmail || "")
      .trim()
      .toLowerCase();
    const duplicateEmail = (request.data?.duplicateEmail || "")
      .trim()
      .toLowerCase();

    if (!originalEmail || !duplicateEmail) {
      throw new HttpsError(
        "invalid-argument",
        "originalEmail and duplicateEmail are required."
      );
    }

    if (originalEmail === duplicateEmail) {
      throw new HttpsError(
        "invalid-argument",
        "Original and duplicate emails must be different."
      );
    }

    const callerSnap = await db.doc(`users/${request.auth.uid}`).get();
    if (!callerSnap.exists) {
      throw new HttpsError("permission-denied", "Caller not found.");
    }
    const caller = callerSnap.data()!;
    const allowedRoles = new Set(["admin", "super-admin", "developer"]);
    if (!allowedRoles.has(caller.role)) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    // Resolve the account to keep.
    let originalAuthUser: admin.auth.UserRecord;
    try {
      originalAuthUser = await admin.auth().getUserByEmail(originalEmail);
    } catch {
      throw new HttpsError(
        "not-found",
        `No account found for ${originalEmail}.`
      );
    }

    const originalUid = originalAuthUser.uid;
    const originalDocSnap = await db.doc(`users/${originalUid}`).get();

    if (!originalDocSnap.exists || !originalDocSnap.data()?.companyId) {
      throw new HttpsError(
        "failed-precondition",
        `${originalEmail} isn't attached to a company — this doesn't look like the account to keep.`
      );
    }
    const originalData = originalDocSnap.data()!;

    // Non-developers may only merge within their own company.
    if (
      caller.role !== "developer" &&
      caller.companyId !== originalData.companyId
    ) {
      throw new HttpsError(
        "permission-denied",
        "You can only merge accounts within your own company."
      );
    }

    // Resolve the stray/duplicate account, if it still exists. It's normal
    // for it not to — an admin may have already deleted it by hand via the
    // Firebase console before finding this tool.
    let duplicateAuthUser: admin.auth.UserRecord | null = null;
    try {
      duplicateAuthUser = await admin.auth().getUserByEmail(duplicateEmail);
    } catch {
      duplicateAuthUser = null;
    }

    let removedDuplicateUid: string | null = null;

    if (!duplicateAuthUser) {
      if (!request.data?.confirmNoExistingDuplicate) {
        // Distinguish "typo" from "already cleaned up" — require an
        // explicit confirmation before treating a missing account as fine.
        throw new HttpsError(
          "not-found",
          `No Auth account exists for ${duplicateEmail}. If you already deleted it ` +
            "yourself, resubmit with confirmNoExistingDuplicate to attach this email " +
            `to ${originalEmail} anyway.`,
          { requiresConfirmation: true, duplicateEmail }
        );
      }
      // Nothing to delete — the duplicate is already gone. Fall through to
      // moving the email onto the original account.
    } else {
      const duplicateUid = duplicateAuthUser.uid;
      removedDuplicateUid = duplicateUid;

      if (duplicateUid === originalUid) {
        throw new HttpsError(
          "invalid-argument",
          "Both emails already belong to the same account."
        );
      }

      const duplicateDocSnap = await db.doc(`users/${duplicateUid}`).get();
      if (duplicateDocSnap.exists && duplicateDocSnap.data()?.companyId) {
        throw new HttpsError(
          "failed-precondition",
          `${duplicateEmail} already belongs to a company — this looks like a real ` +
            "second account, not a duplicate. Refusing to merge."
        );
      }

      // 1) Free up the new email by removing the duplicate Auth account.
      await admin.auth().deleteUser(duplicateUid);

      // 2) Remove any partial Firestore doc the duplicate left behind.
      if (duplicateDocSnap.exists) {
        await db.doc(`users/${duplicateUid}`).delete();
      }
    }

    // 3) Move the new email onto the original account.
    try {
      await admin.auth().updateUser(originalUid, {
        email: duplicateEmail,
        emailVerified: false,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new HttpsError(
        "internal",
        `Duplicate account removed, but updating ${originalEmail} (uid ${originalUid}) ` +
          `to ${duplicateEmail} failed: ${msg}. Apply it by hand and re-run if needed.`
      );
    }

    // 4) Keep the Firestore doc in sync.
    await db.doc(`users/${originalUid}`).update({
      email: duplicateEmail,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 5) Audit trail — this is a destructive, security-sensitive operation.
    await db.collection("auditLogs").add({
      ts: admin.firestore.FieldValue.serverTimestamp(),
      action: "user.mergeDuplicateAccount",
      actorUid: request.auth.uid,
      actorRole: caller.role,
      originalUid,
      oldEmail: originalEmail,
      newEmail: duplicateEmail,
      removedDuplicateUid,
      companyId: originalData.companyId,
    });

    return {
      success: true,
      uid: originalUid,
      newEmail: duplicateEmail,
      note:
        "Merged. Tell the user to sign in with their password using the new email. If they try Google sign-in first, " +
        "Firebase will ask them to verify with a password once, then Google will link automatically.",
    };
  }
);
