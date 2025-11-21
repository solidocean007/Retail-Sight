export function getBestImage(post: { imagePath: string; imageUrl?: string }) {
  if (!post.imagePath && post.imageUrl) {
    // Legacy posts where only a URL was saved
    return {
      thumb: post.imageUrl,
      small: post.imageUrl,
      medium: post.imageUrl,
    };
  }

  const base = post.imagePath.replace(/\.\w+$/, "");

  return {
    thumb: `${base}_200x200.webp`,
    small: `${base}_600x600.webp`,
    medium: `${base}_1200x1200.webp`,
    original: post.imageUrl ?? post.imagePath,
  };
}
