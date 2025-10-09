import { onCall } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as functions from "firebase-functions/v2";

const db = getFirestore();

/**
 * Supplier shares (highlights) a post with a connected distributor company.
 * Adds the distributor ID to the post’s sharedWithCompanies array
 * and records an entry under /posts/{postId}/shares.
 */
export const sharePostWithCompany = onCall(async (request) => {
  const { postId, targetCompanyId, reason } = request.data;

  const auth = request.auth;
  if (!auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be logged in"
    );
  }

  const userId = auth.uid;
  const userCompanyId = auth.token.companyId;
  const userRole = auth.token.role;

  if (userRole !== "supplier") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only suppliers can share posts"
    );
  }

  // Verify approved connection
  const connectionSnap = await db
    .collection("companyConnections")
    .where("fromCompanyId", "==", userCompanyId)
    .where("toCompanyId", "==", targetCompanyId)
    .where("status", "==", "approved")
    .limit(1)
    .get();

  if (connectionSnap.empty) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "No approved connection"
    );
  }

  // Write share entry
  await db
    .collection("posts")
    .doc(postId)
    .collection("shares")
    .add({
      sharedByCompanyId: userCompanyId,
      targetCompanyId,
      reason: reason || "",
      sharedByUserId: userId,
      sharedAt: FieldValue.serverTimestamp(),
    });

  // Update parent post’s sharedWithCompanies array
  await db
    .collection("posts")
    .doc(postId)
    .update({
      sharedWithCompanies: FieldValue.arrayUnion(targetCompanyId),
    });

  return { success: true };
});
