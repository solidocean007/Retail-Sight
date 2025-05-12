export const extractHashtags = (description: string) => {
  return (
    description
      .match(/#\s*\w+/g) // Match hashtags (with possible spaces after '#')
      ?.map((tag) => tag.toLowerCase().replace(/\s+/g, "")) || [] // Convert to lowercase and remove spaces
  );
};

export const extractStarTags = (description: string) => {
  return (
    description
      .match(/\*\s*\w+/g) // Match starTags (with possible spaces after '*')
      ?.map((tag) => tag.toLowerCase().replace(/\s+/g, "")) || [] // Convert to lowercase and remove spaces
  );
};
