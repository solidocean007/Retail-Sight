import { generateShareTokenAndGetLink } from "../utils/generateShareTokenAndGetLink";

// sharePost.ts
const sharePost = async (postId: string, postTitle: string) => {
  try {
    const postLink = ""; // If you have a predefined way to generate the direct link to a post, use it here
    const shareableLink = await generateShareTokenAndGetLink(postId, postTitle, postLink);
    
    // Use Web Share API if available
    if (navigator.share) {
      await navigator.share({
        title: `Share: ${postTitle}`,
        url: shareableLink,
      });
      console.log("Post shared successfully.");
    } else {
      // Optionally, fallback to copying the link to the clipboard
      await navigator.clipboard.writeText(shareableLink);
      console.log("Link copied to clipboard.");
    }
  } catch (error) {
    console.error("Error sharing post:", error);
  }
};

export default sharePost;
