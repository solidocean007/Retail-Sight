// Assuming this file is now considered a utility rather than a React component,
// you might rename it to sharePost.ts or something similar to reflect its purpose.

const sharePost = async (postId: string) => {
  // Keep the logic to generate or retrieve the shortened link.
  let shortenedLink = ""; // Assume you fetch or generate this as needed.

  // The logic to generate the shareable link remains.
  const createShareableLink = () => {
    const postLink = `https://displaygram.com/${postId}`;
    const linkToShare = shortenedLink || postLink;
    const postTitle = 'Check out this awesome display!'
    const encodedTitle = encodeURIComponent(postTitle);
    return `${linkToShare}?postId=${postId}&title=${encodedTitle}`;
  };

  const shareableLink = createShareableLink();

  // Directly attempt to share or copy to clipboard, as before.
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Share Post",
        url: shareableLink,
      });
      console.log("Post shared successfully.");
    } catch (error) {
      console.error("Error sharing:", error);
    }
  } else {
    try {
      await navigator.clipboard.writeText(shareableLink);
      console.log("Link copied to clipboard");
    } catch (error) {
      console.error("Error copying link to clipboard:", error);
    }
  }
};

export default sharePost;
