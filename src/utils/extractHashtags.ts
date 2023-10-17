export const extractHashtags = (description: string) => {
  const hashtagPattern = /#\w+/g;
  return description.match(hashtagPattern) || [];
};