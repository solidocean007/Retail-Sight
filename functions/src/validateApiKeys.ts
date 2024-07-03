// validateApiKeys.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const validateApiKey = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Authentication is required."
    );
  }
  const {apiKey} = data;

  if (!apiKey) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with a valid 'apiKey'."
    );
  }

  try {
    const apiKeyDoc = await admin
      .firestore().collection("apiKeys").doc(apiKey).get();
    if (!apiKeyDoc.exists) {
      throw new functions.https.HttpsError("not-found", "API key not found.");
    }

    const apiKeyData = apiKeyDoc.data();
    return {valid: true, permissions: apiKeyData?.permissions};
  } catch (error) {
    console.error("Failed to validate API key:", error);
    throw new functions.https.HttpsError(
      "unknown",
      "Failed to validate API key",
      error
    );
  }
});

