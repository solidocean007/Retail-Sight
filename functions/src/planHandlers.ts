import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v2";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

/**
 * 🔹 getPlanDetails
 * Fetches public plan data from /plans/{planName}
 */
export const getPlanDetails = onCall(async (request) => {
  const { planName } = request.data;

  if (!planName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required field: planName"
    );
  }

  try {
    const snap = await db.collection("plans").doc(planName).get();

    if (!snap.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        `Plan '${planName}' not found`
      );
    }

    const plan = snap.data();
    // return only public-safe fields
    return {
      name: planName,
      price: plan?.price ?? 0,
      description: plan?.description ?? "",
      connectionLimit: plan?.connectionLimit ?? 0,
      userLimit: plan?.userLimit ?? 0,
      features: plan?.features ?? [],
    };
  } catch (err: any) {
    console.error("getPlanDetails failed:", err);
    throw new functions.https.HttpsError(
      "internal",
      "Unable to fetch plan details."
    );
  }
});
