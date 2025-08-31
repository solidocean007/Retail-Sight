import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const checkUserExists = onCall<{ email: string }>(async (req) => {
  const email = req.data?.email?.trim().toLowerCase();

  if (!email) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    return {
      exists: true,
      uid: userRecord.uid,
    };
  } catch (err) {
    // Type-safe error handling
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as any).code === "auth/user-not-found"
    ) {
      return { exists: false };
    }

    console.error("checkUserExists error:", err);
    throw new HttpsError("internal", "Error checking user existence.");
  }
});
