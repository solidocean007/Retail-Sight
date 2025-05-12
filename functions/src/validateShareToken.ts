import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the input data type
interface ValidateShareTokenData {
  collectionId: string;
  token: string;
}

export const validateShareToken = functions.https.onCall(
  async (request: functions.https.CallableRequest<ValidateShareTokenData>) => {
    const { collectionId, token } = request.data;

    if (!collectionId || !token) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with 'collectionId' and 'token'."
      );
    }

    const collectionRef = admin
      .firestore()
      .collection("collections")
      .doc(collectionId);

    try {
      const doc = await collectionRef.get();
      if (!doc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Collection does not exist."
        );
      }

      const collection = doc.data();
      if (!collection) {
        throw new functions.https.HttpsError(
          "internal",
          "Failed to retrieve collection data."
        );
      }
      const isTokenValid = token === collection.shareToken;

      return { valid: isTokenValid };
    } catch (error) {
      console.error("Error validating share token:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while validating the share token."
      );
    }
  }
);
