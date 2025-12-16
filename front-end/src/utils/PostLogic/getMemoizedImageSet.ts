

// utils/PostLogic/getMemoizedImageSet.ts

export type ImageSet = {
  feed: string | null;
  modal: string | null;
};

export function getMemoizedImageSet(post: ImageSet): {
  feed: string | null;
  modal: string | null;
} {
  const small = post.imageUrls?.small?.[0];
  const medium = post.imageUrls?.medium?.[0];
  const large = post.imageUrls?.large?.[0];
  const original = post.imageUrls?.original?.[0];

  // FEED: pick the BEST reasonable size
  const feed =
    medium ||
    large ||
    small ||
    null;

  return {
    feed,
    modal: original || feed,
  };
}

