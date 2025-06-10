import { PostWithID } from "../utils/types";

export function normalizePost(post: any): PostWithID {
  return {
    ...post,
    displayDate: post.displayDate?.toDate?.() || post.displayDate || null,
    createdAt: post.createdAt?.toDate?.() || post.createdAt || null,
    updatedAt: post.updatedAt?.toDate?.() || post.updatedAt || null,
    tokens: post.tokens?.map((t: any) => ({
      ...t,
      expiry: t.expiry?.toDate?.() || t.expiry || null,
    })) || [],
  };
}
