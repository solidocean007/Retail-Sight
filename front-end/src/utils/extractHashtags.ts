export const extractHashtags = (description: string) => {
  const lowerCaseDescription = description.toLowerCase();
  const hashtagPattern = /#\w+/g;
  return lowerCaseDescription.match(hashtagPattern) || [];
};

export const extractStarTags = (description: string) => {
  const starTagPattern = /\*\w+/g;
  return description.match(starTagPattern) || [];
};
