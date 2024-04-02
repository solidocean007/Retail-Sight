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
    throw new functions.https.HttpsError("not-found", "Post does not exist.");
  }

  const post = doc.data();
  if (!post) {
    throw new functions.https.HttpsError(
      "internal",
      "Failed to retrieve post data."
    );
  }
  const tokenExpiry = post.tokenExpiry ?
    new Date(post.tokenExpiry.toDate()) :
    null;
  const isTokenValid =
    token === post.shareToken && tokenExpiry && new Date() < tokenExpiry;

  return {valid: isTokenValid || false};
});
