// Assuming postToken is an object { sharedToken: string; tokenExpiry: string }
// Inside buildPostLink.ts
const buildPostLink = (postId: string, sharedToken?: string) => {
  console.log(sharedToken)
  if (!sharedToken) {
    throw new Error("Shared token is undefined.");
  }
  return `https://displaygram.com/view-shared-post?id=${postId}&token=${sharedToken}`;
};

export default buildPostLink;
