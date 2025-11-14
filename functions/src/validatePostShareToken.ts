import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Validates a post share token and returns the public-safe version of the post.
 *
 * Expected payload:
 *   { postId: string, token: string }
 *
 * Returns:
 *   { valid: true, post: {...} }
 *   OR
 *   { valid: false, error: string }
 */
export const validatePostShareToken = onCall(
  { region: "us-east4" },
  async (req) => {
    try {
      const { postId, token } = req.data || {};

      // ------------------------------
      // 1. Basic Parameter Validation
      // ------------------------------
      if (!postId || !token) {
        return {
          valid: false,
          error: "Missing postId or token.",
        };
      }

      // ------------------------------
      // 2. Fetch Token Document
      // ------------------------------
      const tokenRef = db.collection("shareTokens").doc(token);
      const tokenSnap = await tokenRef.get();

      if (!tokenSnap.exists) {
        return {
          valid: false,
          error: "Invalid or expired link.",
        };
      }

      const tokenData = tokenSnap.data();

      // ------------------------------
      // 3. Check Token Flags
      // ------------------------------
      if (tokenData?.revoked) {
        return {
          valid: false,
          error: "This link has been revoked.",
        };
      }

      if (tokenData?.postId !== postId) {
        return {
          valid: false,
          error: "Token does not match the requested post.",
        };
      }

      // ------------------------------
      // 4. Check Expiration
      // ------------------------------
      if (tokenData?.expiresAt) {
        const exp = tokenData.expiresAt.toMillis
          ? tokenData.expiresAt.toMillis()
          : tokenData.expiresAt;

        if (exp < Date.now()) {
          return {
            valid: false,
            error: "This link has expired.",
          };
        }
      }

      // ------------------------------
      // 5. Load the Post
      // ------------------------------
      const postRef = db.collection("posts").doc(postId);
      const postSnap = await postRef.get();

      if (!postSnap.exists) {
        return {
          valid: false,
          error: "Post not found.",
        };
      }

      const postData = postSnap.data();

      // ------------------------------
      // 6. Strip sensitive fields
      // ------------------------------
      // Anything private (company internals, etc.) should NOT be visible on share links
      // Add/remove fields as needed.
      const safePost = {
        id: postSnap.id,
        imageUrl: postData?.imageUrl ?? null,
        originalImageUrl: postData?.originalImageUrl ?? null,
        description: postData?.description ?? "",
        brands: postData?.brands ?? [],
        account: postData?.account ?? null,
        displayDate: postData?.displayDate ?? null,
        postedBy: postData?.postedBy ?? null,
        postUser: postData?.postUser ?? null,
        galloGoalTitle: postData?.galloGoalTitle ?? null,
        companyGoalTitle: postData?.companyGoalTitle ?? null,
        // Add fields here that are safe to display publicly
      };

      // ------------------------------
      // 7. Return sanitized post
      // ------------------------------
      return {
        valid: true,
        post: safePost,
      };
    } catch (err: any) {
      console.error("validatePostShareToken error:", err);
      return {
        valid: false,
        error: err.message || "Unexpected server error.",
      };
    }
  }
);
