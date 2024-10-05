import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the expected input type for the function
interface GeneratePostShareTokenParams {
  postId: string;
}

export const generatePostShareToken = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<GeneratePostShareTokenParams>
  ) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The function must be called while authenticated."
      );
    }

    const { postId } = request.data;
    if (!postId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a valid 'postId'."
      );
    }

    const shareToken = uuidv4();
    const tokenExpiryTimestamp = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );
    const tokenExpiryString = tokenExpiryTimestamp.toDate().toISOString();

    try {
      const currentISOTimeString = new Date().toISOString();

      await admin.firestore().collection("posts").doc(postId).update({
        "token.sharedToken": shareToken,
        "token.tokenExpiry": tokenExpiryString,
        timestamp: currentISOTimeString,
      });

      return { shareToken, tokenExpiry: tokenExpiryString };
    } catch (error) {
      console.error("Failed to generate post share token:", error);
      throw new functions.https.HttpsError(
        "unknown",
        "Failed to generate post share token",
        error
      );
    }
  }
);
