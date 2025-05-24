import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

interface ValidatePostShareTokenData {
  postId: string;
  token: string;
}

interface PostData {
  tokens?: { token: { sharedToken: string; tokenExpiry?: string } }[];
  [key: string]: any;
}

export const validatePostShareToken = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<ValidatePostShareTokenData>
  ): Promise<{ valid: boolean; post: PostData }> => {
    const { postId, token } = request.data;

    if (!postId || !token) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with 'postId' and 'token'."
      );
    }

    const postRef = admin.firestore().collection("posts").doc(postId);

    try {
      const doc = await postRef.get();
      if (!doc.exists) {
        throw new functions.https.HttpsError("not-found", "Post does not exist.");
      }

      const post = doc.data() as PostData;
      const now = new Date();

      const originalTokens = Array.isArray(post.tokens) ? post.tokens : [];

      // Separate valid tokens from expired ones
      const validTokens = originalTokens.filter((t) => {
        const expiry = t?.token?.tokenExpiry;
        return expiry && new Date(expiry) > now;
      });

      const matchingToken = validTokens.find(
        (t) => t.token.sharedToken === token
      );

      const isTokenValid = !!matchingToken;

      // If any expired tokens were removed, update the post document
      if (validTokens.length !== originalTokens.length) {
        await postRef.update({ tokens: validTokens });
        console.log(`🧼 Cleaned expired tokens for post ${postId}`);
      }

      if (!isTokenValid) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Invalid or expired token."
        );
      }

      return { valid: true, post: { id: doc.id, ...post } };
    } catch (error) {
      console.error("Error validating post share token:", error);
      throw new functions.https.HttpsError(
        "internal",
        "An error occurred while validating the post share token"
      );
    }
  }
);
