// validateApiKey.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Function to validate API key and permissions
export const validateApiKey = functions.https.onCall(async (data, context) => {
  // how will i use context here?

  const {apiKey, action} = data;

  if (!apiKey || !action) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "API key and action are required."
    );
  }
  // the api key document for this company has a doc id of the users companyId string.  is this next line still correct?
  const apiKeyDoc = await admin.firestore().collection("apiKeys").where("apiKey", "==", apiKey).get();

  if (apiKeyDoc.empty) {
    throw new functions.https.HttpsError("not-found", "API key not found.");
  }

  const apiKeyData = apiKeyDoc.docs[0].data(); // what is this?

  if (action === "read" && !apiKeyData.permissions.canRead) {
    throw new functions.https.HttpsError("permission-denied", "Read permission denied.");
  }

  if (action === "write" && !apiKeyData.permissions.canWrite) {
    throw new functions.https.HttpsError("permission-denied", "Write permission denied.");
  }

  // Proceed with the action (e.g., read/write to Firestore)
  return {success: true, message: "Permission granted."};
});
