export const extractHashtags = (description: string) => {
  const lowerCaseDescription = description.toLowerCase();
  // Include dash in the pattern
  const hashtagPattern = /#[\w-]+/g;
  return lowerCaseDescription.match(hashtagPattern) || [];
};

export const extractStarTags = (description: string) => {
  // Include dash in the pattern
  const starTagPattern = /\*[\w-]+/g;
  return description.match(starTagPattern) || [];
};
