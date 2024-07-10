// validateShareToken
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const validateShareToken = functions.https.onCall(async (data) => {
  const { collectionId, token } = data;
  const collectionRef = admin
    .firestore()
    .collection("collections")
    .doc(collectionId);

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

  const tokenExpiry = collection.tokenExpiry
    ? new Date(collection.tokenExpiry.toDate())
    : null;
  const isTokenValid =
    token === collection.shareToken && tokenExpiry && new Date() < tokenExpiry;

  return { valid: isTokenValid || false };
});
