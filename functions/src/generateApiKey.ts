// generateApiKey.ts
// generateApiKey.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the expected input type for the function
interface GenerateApiKeyParams {
  companyId: string;
  permissions: string[];
}

export const generateApiKey = functions.https.onCall(
  async (request: functions.https.CallableRequest<GenerateApiKeyParams>) => {
    // Ensure the user is authenticated
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The function must be called while authenticated."
      );
    }

    const { companyId, permissions } = request.data;
    if (!companyId || !permissions) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with 'companyId' and 'permissions'."
      );
    }

    const apiKey = uuidv4();

    try {
      await admin.firestore().collection("apiKeys").doc(companyId).set({
        apiKey: apiKey,
        companyId: companyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        permissions: permissions,
      });

      return { apiKey: apiKey };
    } catch (error) {
      console.error("Failed to generate API key:", error);
      throw new functions.https.HttpsError(
        "unknown",
        "Failed to generate API key",
        error
      );
    }
  }
);
