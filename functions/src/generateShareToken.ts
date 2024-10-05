import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the expected input type for the function
interface GenerateShareTokenParams {
  collectionId: string;
}

export const generateShareToken = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<GenerateShareTokenParams>
  ) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The function must be called while authenticated."
      );
    }

    const { collectionId } = request.data;
    if (!collectionId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a valid 'collectionId'."
      );
    }

    const shareToken = uuidv4();
    const tokenExpiryTimestamp = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    );

    try {
      await admin
        .firestore()
        .collection("collections")
        .doc(collectionId)
        .update({
          shareToken: shareToken,
          tokenExpiry: tokenExpiryTimestamp,
        });
      return { shareToken };
    } catch (error) {
      console.error("Failed to generate share token:", error);
      throw new functions.https.HttpsError(
        "unknown",
        "Failed to generate share token",
        error
      );
    }
  }
);
