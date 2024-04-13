// validatePostShareToken.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const validatePostShareToken = functions.https.onCall(async (data) => {
  const {postId, token} = data;
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

  // Correcting the field accesses to account for the token object structure
  const tokenExpiry = post.token?.tokenExpiry ?
    new Date(post.token.tokenExpiry) :
    null;
  const sharedToken = post.token?.sharedToken;

  console.log(`Token expiry for post ID ${postId}: ${tokenExpiry}`);
  console.log(`Shared token for post ID ${postId}: ${sharedToken}`);

  const currentDateTime = new Date();
  const isTokenValid =
    token === sharedToken && tokenExpiry && currentDateTime < tokenExpiry;

  console.log(`Is token valid: ${isTokenValid}`);
  console.log(`Current server time: ${currentDateTime}`);

  return {valid: isTokenValid || false};
});
