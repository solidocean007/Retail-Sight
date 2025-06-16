import { Timestamp } from "@firebase/firestore";
import { PostWithID } from "../utils/types";

export function normalizePost(post: any): PostWithID {
  return {
    ...post,
    timestamp: normalizeDate(post.timestamp),
    displayDate: normalizeDate(post.displayDate),
    createdAt: normalizeDate(post.createdAt),
    updatedAt: normalizeDate(post.updatedAt),
    tokens: Array.isArray(post.tokens)
      ? post.tokens.map((t: any) => ({
          ...t,
          expiry: normalizeDate(t.expiry),
        }))
      : [],
  };
}

function normalizeDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  return null;
}

