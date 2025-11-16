import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

export const generatePostShareToken = onCall(async (request) => {
  const { postId, expiresInHours = 48 } = request.data || {};
  const auth = request.auth;

  if (!auth || !auth.uid) {
    throw new Error("Authentication required.");
  }

  if (!postId) {
    throw new Error("postId missing.");
  }

  // Create a random short token
  const token = uuidv4().replace(/-/g, "").slice(0, 12);

  // Expiration timestamp
  const expiresAt =
    expiresInHours > 0
      ? admin.firestore.Timestamp.fromMillis(
          Date.now() + expiresInHours * 3600 * 1000
        )
      : null;

  // Store in /shareTokens
  await db.collection("shareTokens").doc(token).set({
    postId,
    createdBy: auth.uid,
    createdAt: admin.firestore.Timestamp.now(),
    expiresAt,
    revoked: false,
  });

  // Build long URL
  const longUrl = `https://displaygram.com/view-shared-post/${postId}/${token}`;

  return {
    token,
    longUrl,
    expiresAt,
  };
});
