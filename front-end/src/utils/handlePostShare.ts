// handlePostShare.ts
import { showMessage } from "../Slices/snackbarSlice";
import buildPostLink from "./buildPostLink";
import { TokenData } from "./types";
import { updatePostToken } from "./updatePostToken";
import { getFunctions, httpsCallable } from "@firebase/functions";

interface GeneratePostShareTokenResponse {
  sharedToken: string;
  tokenExpiry: string;
}

export const handlePostShare = async (
  postId: string,
  tokenParam: TokenData,
) => {
  const functions = getFunctions();
  const getSharePostTokenFunction = httpsCallable(
    functions,
    "generatePostShareToken",
  );
  let token = { ...tokenParam };

  try {
    if (!token.sharedToken || new Date() > new Date(token.tokenExpiry || 0)) {
      const result = await getSharePostTokenFunction({ postId });
      const newTokenData = result.data as GeneratePostShareTokenResponse; // should this be awaited?

      if (newTokenData.sharedToken && newTokenData.tokenExpiry) {
        token.sharedToken = newTokenData.sharedToken;
        token.tokenExpiry = newTokenData.tokenExpiry;

        await updatePostToken({ postId, token });
      } else {
        showMessage("Failed to generate a valid share token."); // when a token has expired this throws
      }
    }

    const shareableLink = buildPostLink(postId, token.sharedToken);
    await navigator.share({ url: shareableLink });
    console.log("Post shared successfully.");
  } catch (error) {
    console.error("Error sharing the post:", error);
    showMessage(`Error sharing the post. Please try again.", ${error}`);
  }
};
