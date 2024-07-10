// generateShareToken.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

admin.initializeApp();

export const generateShareToken = functions.https.onCall(async (data) => {
  const collectionId = data.collectionId;
  const shareToken = uuidv4();
  const expiryTimestamp = new Date();
  expiryTimestamp.setHours(expiryTimestamp.getHours() + 24);

  try {
    await admin.firestore().collection("collections").doc(collectionId).update({
      shareToken: shareToken,
      tokenExpiry: expiryTimestamp,
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
});
