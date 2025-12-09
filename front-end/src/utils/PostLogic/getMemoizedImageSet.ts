import { PostWithID } from "../types";
import { resolvePostImage } from "./resolvePostImage";

const imageCache = new Map<string, ReturnType<typeof resolvePostImage>>();

export function getMemoizedImageSet(post: PostWithID) {
  if (imageCache.has(post.id)) {
    return imageCache.get(post.id)!;
  }

  const result = resolvePostImage(post);
  imageCache.set(post.id, result);
  return result;
}
