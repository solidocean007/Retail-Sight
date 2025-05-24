import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

interface GeneratePostShareTokenParams {
  postId: string;
}

export const generatePostShareToken = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<GeneratePostShareTokenParams>
  ) => {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "The function must be called while authenticated."
      );
    }

    const { postId } = request.data;
    if (!postId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required parameter: postId"
      );
    }

    const shareToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // ✅ 24-hour expiry
    const now = new Date().toISOString();

    try {
      const postRef = admin.firestore().collection("posts").doc(postId);
      const docSnap = await postRef.get();

      if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Post not found.");
      }

      const existingData = docSnap.data();
      const existingTokens = Array.isArray(existingData?.tokens)
        ? existingData.tokens
        : [];

      const updatedTokens = [
        ...existingTokens,
        {
          token: {
            sharedToken: shareToken,
            tokenExpiry,
          },
        },
      ];

      await postRef.update({
        tokens: updatedTokens,
        timestamp: now,
        token: admin.firestore.FieldValue.delete(), // ✅ clean up legacy token field
      });

      return {
        shareToken,
        tokenExpiry,
        message: "New token added to tokens[] array.",
      };
    } catch (error) {
      console.error("Error updating post with share token:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update post with share token",
        error
      );
    }
  }
);

