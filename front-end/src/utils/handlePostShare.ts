import buildPostLink from "./buildPostLink";

export const handlePostShare = async (postId: string) => {
  try {
    console.log(`Generating or reusing share token for post ${postId}...`);

    const response = await fetch('https://my-fetch-data-api.vercel.app/api/generatePostShareToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });

    const data = await response.json();
    const newToken = data.token;

    if (!newToken) {
      console.error("Failed to generate token.");
      throw new Error("Failed to generate token.");
    }

    const shareableLink = buildPostLink(postId, newToken);
    console.log("Shareable Link:", shareableLink);

    return shareableLink;
  } catch (error) {
    console.error("Failed to share post:", error);
    throw error;
  }
};


