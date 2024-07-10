// updateUserProfile.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const updateUserProfile = functions.https.onCall(
  async (data, context) => {
    // Ensure the user is authenticated
    if (!context.auth || !context.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    try {
      // Construct the new display name
      const newDisplayName = `${data.firstName} ${data.lastName}`;

      // Update the user's profile in Firebase Authentication
      await admin.auth().updateUser(context.auth.uid, {
        displayName: newDisplayName,
      });

      // If needed, update the user's first and last names
      // in Firestore or another database
      // ...

      return { result: "User profile updated successfully" };
    } catch (error) {
      console.error("Error updating user profile:", error);
      throw new functions.https.HttpsError(
        "unknown",
        "An error occurred while updating the user profile."
      );
    }
  }
);
