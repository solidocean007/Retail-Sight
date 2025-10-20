import { PostWithID } from "../utils/types";

export function normalizePost(post: any): PostWithID {
  const normalized: any = {
    ...post,
    timestamp: normalizeDate(post.timestamp),
    displayDate: normalizeDate(post.displayDate),
    createdAt: normalizeDate(post.createdAt),
    updatedAt: normalizeDate(post.updatedAt),
  };

  // ✅ Handle autoSharedAt (or autoShared)
  if (post.autoSharedAt) normalized.autoSharedAt = normalizeDate(post.autoSharedAt);
  if (post.autoShared) normalized.autoShared = normalizeDate(post.autoShared);

  // ✅ Normalize nested postedBy
  if (post.postedBy) {
    normalized.postedBy = {
      ...post.postedBy,
      createdAt: normalizeDate(post.postedBy.createdAt),
      updatedAt: normalizeDate(post.postedBy.updatedAt),
    };
  }

  // ✅ Normalize tokens if any
  if (Array.isArray(post.tokens)) {
    normalized.tokens = post.tokens.map((t: any) => ({
      ...t,
      expiry: normalizeDate(t.expiry),
    }));
  } else if (post.tokens) {
    console.warn("[normalizePost] Unexpected tokens format:", post.tokens);
    normalized.tokens = [];
  }

  return normalized as PostWithID;
}

function normalizeDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  console.warn("[normalizeDate] Unrecognized date format:", value);
  return null;
}
