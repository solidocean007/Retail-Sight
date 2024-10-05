import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the expected input type for the function
interface GetApiKeyParams {
  companyId: string;
}

export const getApiKey = functions.https.onCall(
  async (request: functions.https.CallableRequest<GetApiKeyParams>) => {
    console.log("Function getApiKey called with data:", request.data);

    // Ensure the user is authenticated
    if (!request.auth) {
      console.error("Unauthenticated request");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication is required."
      );
    }

    const db = admin.firestore();
    const { companyId } = request.data;

    if (!companyId) {
      console.error("Invalid argument: companyId is required");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Company ID is required."
      );
    }

    try {
      const doc = await db.collection("apiKeys").doc(companyId).get();
      console.log("Document retrieved:", doc.exists);

      if (!doc.exists) {
        console.error("No API key found for company:", companyId);
        throw new functions.https.HttpsError(
          "not-found",
          "No API key found for this company"
        );
      }

      const apiKey = doc.data()?.apiKey;
      if (!apiKey) {
        console.error("API key not found in document for company:", companyId);
        throw new functions.https.HttpsError(
          "not-found",
          "No API key found for this company"
        );
      }

      console.log("API key retrieved successfully:", apiKey);
      return { apiKey };
    } catch (error) {
      console.error("Error retrieving document:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Error retrieving API key"
      );
    }
  }
);
