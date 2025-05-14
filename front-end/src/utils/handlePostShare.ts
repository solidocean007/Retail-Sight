// handlePostShare.ts
import { showMessage } from "../Slices/snackbarSlice";
import { doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import buildPostLink from "./buildPostLink";

interface TokenData {
  sharedToken: string;
  tokenExpiry?: string;
}

export const handlePostShare = async (postId: string, tokenData: TokenData) => {
  try {
    console.log(`Extending token expiry for post ${postId}...`);

    // Set expiry to 7 days from now
    const newExpiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiryTimestamp = Timestamp.fromDate(newExpiryDate);

    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, { "token.tokenExpiry": expiryTimestamp });

    console.log(`Token expiry extended to ${newExpiryDate.toISOString()}.`);

    // Fetch the updated post data
    const postSnapshot = await getDoc(postRef);
    const updatedPostData = postSnapshot.data();
    const updatedTokenData = updatedPostData?.token;

    if (!updatedTokenData) {
      showMessage("Failed to generate a valid share token.");
      return; // or throw new Error("Failed to fetch updated token data.");
    }

    const functions = getFunctions();
    const generatePostShareToken = httpsCallable(
      functions,
      "generatePostShareToken"
    );
    const response = await generatePostShareToken({
      postId,
      tokenData: updatedTokenData,
    });
    const newToken = (response.data as { token: string }).token;

    const shareableLink = buildPostLink(postId, newToken);
    console.log("Shareable Link:", shareableLink);
    showMessage("Post Shared");
    return shareableLink;
  } catch (error) {
    console.error("Failed to share post:", error);
    throw error;
  }
};
