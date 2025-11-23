import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const checkUserExists = onCall<{ email: string; companyId?: string }>(
  async (req) => {
    const email = req.data?.email?.trim().toLowerCase();
    const inviteCompanyId = req.data?.companyId;

    if (!email) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }

    try {
      // 🔎 Look up user in Firebase Auth
      const userRecord = await admin.auth().getUserByEmail(email);

      // 🔎 Extract providers (e.g. password, google.com, etc.)
      const signInMethods = userRecord.providerData.map((p) => p.providerId);

      // 🔎 Look up Firestore user doc
      const userDoc = await db.collection("users").doc(userRecord.uid).get();
      const existingCompanyId = userDoc.exists
        ? userDoc.data()?.companyId
        : null;

      // 🚦 Enforce single-company rule
      if (
        existingCompanyId &&
        inviteCompanyId &&
        existingCompanyId !== inviteCompanyId
      ) {
        throw new HttpsError(
          "failed-precondition",
          "This user already belongs to another company."
        );
      }

      return {
        exists: true,
        uid: userRecord.uid,
        companyId: existingCompanyId || null,
        signInMethods, // 👈 return provider info
      };
    } catch (err: any) {
      // correctly detect missing user
      const code =
        err?.code ||
        err?.errorInfo?.code ||
        err?.errorInfo?.message ||
        err?.message;

      if (code === "auth/user-not-found") {
        return { exists: false, signInMethods: [] };
      }

      if (err instanceof HttpsError) {
        throw err;
      }

      console.error("checkUserExists error:", err);
      throw new HttpsError("internal", "Error checking user existence.");
    }
  }
);
