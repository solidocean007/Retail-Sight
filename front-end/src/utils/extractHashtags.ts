export const extractHashtags = (description: string) => {
  const hashtagPattern = /#\w+/g;
  return description.match(hashtagPattern) || [];
};

export const extractStarTags = (description: string) => {
  const starTagPattern = /\*\w+/g;
  return description.match(starTagPattern) || [];
};
