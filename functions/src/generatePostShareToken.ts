// generatePostShareToken.ts
// generatePostShareToken.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const generatePostShareToken = functions.https.onCall(async (data) => {
  const postId = data.postId;
  const shareToken = uuidv4();
  const expiryTimestamp = new Date();
  expiryTimestamp.setHours(expiryTimestamp.getHours() + 24); // Token expires in 24 hours

  try {
    await admin.firestore().collection("posts").doc(postId).update({
      shareToken: shareToken,
      tokenExpiry: expiryTimestamp,
    });
    return { shareToken };
  } catch (error) {
    console.error("Failed to generate post share token:", error);
    throw new functions.https.HttpsError(
      "unknown",
      "Failed to generate post share token",
      error
    );
  }
});

