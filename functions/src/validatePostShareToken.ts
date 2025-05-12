import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Define the input data type
interface ValidatePostShareTokenData {
  postId: string;
  token: string;
}

// Define the post data type (simplified version, adjust according to your Firestore schema)
interface PostData {
  token?: {
    tokenExpiry?: string;
    sharedToken?: string;
  };
  [key: string]: unknown; // Allow other properties as needed
}

export const validatePostShareToken = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<ValidatePostShareTokenData>
  ): Promise<{ valid: boolean; post: PostData }> => {
    const { postId, token } = request.data;

    if (!postId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with 'postId'."
      );
    }

    const postRef = admin.firestore().collection("posts").doc(postId);

    try {
      const doc = await postRef.get();
      if (!doc.exists) {
        console.error(`Post with ID ${postId} does not exist.`);
        throw new functions.https.HttpsError(
          "not-found",
          "Post does not exist."
        );
      }

      const post = doc.data() as PostData;
      if (!post) {
        console.error(`Failed to retrieve post data for post ID ${postId}.`);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to retrieve post data."
        );
      }

      const sharedToken = post.token?.sharedToken;
      const isTokenValid = token === sharedToken;

      if (!isTokenValid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Invalid token."
        );
      }

      // Return both the post and the token validation status
      return { valid: isTokenValid, post: { id: doc.id, ...post } };
    } catch (error) {
      console.error("Error validating post share token:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while validating the post share token."
      );
    }
  }
);
