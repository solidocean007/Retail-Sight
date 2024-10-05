import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the input data type
interface UpdateUserProfileData {
  firstName: string;
  lastName: string;
}

export const updateUserProfile = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<UpdateUserProfileData>
  ): Promise<{ result: string }> => {
    // Ensure the user is authenticated
    if (!request.auth || !request.auth.uid) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const data = request.data;

    // Validate input data
    if (!data.firstName || !data.lastName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with 'firstName' and 'lastName'."
      );
    }

    try {
      // Construct the new display name
      const newDisplayName = `${data.firstName} ${data.lastName}`;

      // Update the user's profile in Firebase Authentication
      await admin.auth().updateUser(request.auth.uid, {
        displayName: newDisplayName,
      });

      // (Optional) Update the user's first and last names in Firestore
      const userRef = admin
        .firestore()
        .collection("users")
        .doc(request.auth.uid);
      await userRef.set(
        { firstName: data.firstName, lastName: data.lastName },
        { merge: true }
      );

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
