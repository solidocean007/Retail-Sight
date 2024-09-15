import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const validatePostShareToken = functions.https.onCall(async (data) => {
  const { postId, token } = data;
  const postRef = admin.firestore().collection("posts").doc(postId);

  const doc = await postRef.get();
  if (!doc.exists) {
    console.error(`Post with ID ${postId} does not exist.`);
    throw new functions.https.HttpsError("not-found", "Post does not exist.");
  }

  const post = doc.data();
  if (!post) {
    console.error(`Failed to retrieve post data for post ID ${postId}.`);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to retrieve post data."
    );
  }

  const tokenExpiry = post.token?.tokenExpiry
    ? new Date(post.token.tokenExpiry)
    : null;
  const sharedToken = post.token?.sharedToken;

  const currentDateTime = new Date(); // Use server time for comparison
  const isTokenValid =
    token === sharedToken && tokenExpiry && currentDateTime < tokenExpiry;

  if (!isTokenValid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Invalid or expired token."
    );
  }

  // Return both the post and the token validation status
  return { valid: isTokenValid, post: { id: doc.id, ...post } };
});
