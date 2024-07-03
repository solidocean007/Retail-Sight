// generateApiKey.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {v4 as uuidv4} from "uuid";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const generateApiKey = functions.https.onCall(async (data, context) => {
  // Ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const {companyId, permissions} = data;
  if (!companyId || !permissions) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'companyName' and 'permissions'."
    );
  }

  const apiKey = uuidv4();

  try {
    await admin.firestore().collection("apiKeys").doc(companyId).set({
      apiKey: apiKey,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      permissions: permissions,
    });

    return {apiKey: apiKey};
  } catch (error) {
    console.error("Failed to generate API key:", error);
    throw new functions.https.HttpsError(
      "unknown",
      "Failed to generate API key",
      error
    );
  }
});


// // Example usage
// const userId = 'galoUserId'; // Replace with actual user ID
// const permissions = {
//   canRead: ['missions'],
//   canWrite: ['missions']
// };

// createApiKey(userId, permissions).then(apiKey => {
//   console.log('API Key:', apiKey);
// });
