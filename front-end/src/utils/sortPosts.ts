import { PostWithID } from "./types";

type SortablePost = PostWithID & {
  createdAt?: unknown;
  timestamp?: unknown;
};

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "object") {
    const timestamp = value as {
      toDate?: () => Date;
      toMillis?: () => number;
    };

    if (typeof timestamp.toMillis === "function") {
      return timestamp.toMillis();
    }

    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime();
    }
  }

  return 0;
};

const getPrimaryTime = (post: SortablePost): number =>
  toMillis(post.displayDate) ||
  toMillis(post.timestamp) ||
  toMillis(post.createdAt);

export const sortPostsNewestFirst = (
  posts: PostWithID[],
): PostWithID[] =>
  [...posts].sort((left, right) => {
    const primaryDifference =
      getPrimaryTime(right as SortablePost) -
      getPrimaryTime(left as SortablePost);

    if (primaryDifference !== 0) return primaryDifference;

    const createdDifference =
      toMillis((right as SortablePost).createdAt) -
      toMillis((left as SortablePost).createdAt);

    if (createdDifference !== 0) return createdDifference;

    return String(right.id ?? "").localeCompare(String(left.id ?? ""));
  });
