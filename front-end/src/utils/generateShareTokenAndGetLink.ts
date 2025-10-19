// shareUtils.ts or a similar utilities file

import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Generates a shareable link for a post using Firebase Functions to create a share token.
 * @param {string} postId The ID of the post to share.
 * @param {string} postTitle The title of the post to share.
 * @param {string} postLink The direct link to the post, if already available.
 * @returns {Promise<string>} A promise that resolves with the shareable link.
 */

interface ShareTokenResponse {
  shareToken: string;
  // Include other properties if your function returns more information
}

export const generateShareTokenAndGetLink = async (
  postId: string,
  postTitle: string,
  postLink: string,
): Promise<string> => {
  const functions = getFunctions(); // Initialize Firebase Functions
  const generatePostShareToken = httpsCallable(
    functions,
    "generatePostShareToken",
  );

  try {
    // Call the function and wait for the token
    const result = await generatePostShareToken({ postId });
    const token = (result.data as ShareTokenResponse).shareToken; // Adjust according to your function's response structure

    // Construct the shareable link with the token
    const encodedTitle = encodeURIComponent(postTitle);
    const linkToShare =
      postLink || `https://displaygram.com/view-shared-post/${postId}`; // postId is here
    const shareableLink = `${linkToShare}?postId=${postId}&token=${token}&title=${encodedTitle}`; // postId is also here??

    return shareableLink;
  } catch (error) {
    console.error("Error generating share token or sharing:", error);
    throw new Error("Failed to generate share link");
  }
};
