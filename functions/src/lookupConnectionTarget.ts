import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const lookupConnectionTarget = onCall(async (req) => {
  const email = req?.data?.email?.trim()?.toLowerCase();
  const fromCompanyId = req?.data?.fromCompanyId;

  if (!email || !email.includes("@")) {
    throw new HttpsError("invalid-argument", "A valid email is required.");
  }

  if (!fromCompanyId) {
    throw new HttpsError("invalid-argument", "fromCompanyId is required.");
  }

  try {
    // ----------------------------------------------------------
    // 1️⃣ Try to look up user in Firebase Auth
    // ----------------------------------------------------------
    let userRecord: admin.auth.UserRecord | null = null;

    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return {
          mode: "invitable", // <-- UI-friendly
          email,
        };
      }
      throw err;
    }

    // ----------------------------------------------------------
    // 2️⃣ SELF-CONNECTION PREVENTION
    // ----------------------------------------------------------
    if (userRecord?.email?.toLowerCase() === email) {
      const userDoc = await db.collection("users").doc(userRecord.uid).get();
      const companyId = userDoc.exists ? userDoc.data()?.companyId : null;

      if (companyId === fromCompanyId) {
        throw new HttpsError(
          "failed-precondition",
          "You cannot connect with yourself or a user from your own company."
        );
      }
    }

    // ----------------------------------------------------------
    // 3️⃣ Look up user’s company
    // ----------------------------------------------------------
    const userDoc = await db.collection("users").doc(userRecord.uid).get();
    const targetCompanyId = userDoc.exists ? userDoc.data()?.companyId : null;

    // Existing DG user but NOT assigned to a company
    if (!targetCompanyId) {
      return {
        mode: "invitable", // <-- Not connected to any company yet
        email,
      };
    }

    // ----------------------------------------------------------
    // 4️⃣ Block same-company connections
    // ----------------------------------------------------------
    if (targetCompanyId === fromCompanyId) {
      throw new HttpsError(
        "failed-precondition",
        "You cannot connect with a user from your own company."
      );
    }

    // ----------------------------------------------------------
    // 5️⃣ Check for existing connection
    // ----------------------------------------------------------
    const existingConnection = await db
      .collection("companyConnections")
      .where("requestFromCompanyId", "in", [fromCompanyId, targetCompanyId])
      .where("requestToCompanyId", "in", [fromCompanyId, targetCompanyId])
      .limit(1)
      .get();

    if (!existingConnection.empty) {
      throw new HttpsError(
        "failed-precondition",
        "You already have a connection with this company."
      );
    }

    // ----------------------------------------------------------
    // 6️⃣ Get company details
    // ----------------------------------------------------------
    const compSnap = await db
      .collection("companies")
      .doc(targetCompanyId)
      .get();

    if (!compSnap.exists) {
      return { mode: "invitable", email };
    }

    const comp = compSnap.data();

    return {
      mode: "user-found",
      email,
      companyId: targetCompanyId,
      companyName: comp?.companyName ?? "Unknown Company",
      companyType: comp?.companyType,
    };
  } catch (err: any) {
    console.error("lookupConnectionTarget error:", err);

    if (err instanceof HttpsError) throw err;

    throw new HttpsError("internal", "Lookup failed.");
  }
});
