const BUCKET = "retail-sight.appspot.com";

function build(path: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

export type FeedImageSet = {
  feedSrc: string | null;
  modalChain: string[];
};

const MULTI_SIZE_CUTOFF = new Date("2025-11-27T02:36:17.409Z");

export function derivePostImageVariants(post: {
  imageUrl?: string;
  originalImageUrl?: string;
  displayDate?: string | Date | { toDate(): Date };
}): FeedImageSet {
  const original = post.originalImageUrl || post.imageUrl;
  if (!original) {
    return { feedSrc: null, modalChain: [] };
  }

  const date =
    post.displayDate instanceof Date
      ? post.displayDate
      : typeof post.displayDate === "string"
      ? new Date(post.displayDate)
      : post.displayDate?.toDate?.();

  const isMultiSizeEra = !!date && date >= MULTI_SIZE_CUTOFF;

  const url = new URL(original);
  const encoded = decodeURIComponent(url.pathname.split("/o/")[1]);
  const slash = encoded.lastIndexOf("/");
  const folder = encoded.substring(0, slash + 1);
  const filename = encoded.substring(slash + 1);

  const ext = filename.split(".").pop() || "jpg";
  const base = filename.replace(/\.\w+$/, "");

  const legacyResized = build(`${folder}resized.${ext}`);
  const legacy200 = build(`${folder}resized_200x200.${ext}`);

  const p800 = build(`${folder}${base}_800x800.${ext}`);
  const p1200 = build(`${folder}${base}_1200x1200.${ext}`);

  return {
    feedSrc: isMultiSizeEra ? p800 : legacyResized || legacy200,
    modalChain: isMultiSizeEra ? [p1200, original] : [original],
  };
}
