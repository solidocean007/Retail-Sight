import { PostWithID } from "../utils/types";

export function normalizePost(post: any): PostWithID {
  return {
    ...post,
    displayDate: post.displayDate?.toDate?.() || post.displayDate || null,
    createdAt: post.createdAt?.toDate?.() || post.createdAt || null,
    updatedAt: post.updatedAt?.toDate?.() || post.updatedAt || null,
    tokens: Array.isArray(post.tokens)
      ? post.tokens.map((t: any) => ({
          ...t,
          expiry:
            typeof t.expiry?.toDate === "function"
              ? t.expiry.toDate().toISOString()
              : t.expiry instanceof Date
              ? t.expiry.toISOString()
              : typeof t.expiry === "string"
              ? t.expiry
              : null,
        }))
      : [],
  };
}

