function build(bucket: string, path: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
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
  offlineCaptureId?: string;
  displayDate?: string | Date | { toDate(): Date };
}): FeedImageSet {
  const original = post.originalImageUrl || post.imageUrl;
  if (!original) {
    return { feedSrc: null, modalChain: [] };
  }
  if (post.offlineCaptureId) {
    return { feedSrc: original, modalChain: [original] };
  }

  const date =
    post.displayDate instanceof Date
      ? post.displayDate
      : typeof post.displayDate === "string"
      ? new Date(post.displayDate)
      : post.displayDate?.toDate?.();

  const isMultiSizeEra = !!date && date >= MULTI_SIZE_CUTOFF;

  const url = new URL(original);
  const bucket = decodeURIComponent(
    url.pathname.split("/b/")[1]?.split("/o/")[0] || "",
  );
  if (!bucket) {
    return { feedSrc: original, modalChain: [original] };
  }
  const encoded = decodeURIComponent(url.pathname.split("/o/")[1]);
  const slash = encoded.lastIndexOf("/");
  const folder = encoded.substring(0, slash + 1);
  const filename = encoded.substring(slash + 1);

  const ext = filename.split(".").pop() || "jpg";
  const base = filename.replace(/\.\w+$/, "");

  const legacyResized = build(bucket, `${folder}resized.${ext}`);
  const legacy200 = build(bucket, `${folder}resized_200x200.${ext}`);

  const p800 = build(bucket, `${folder}${base}_800x800.${ext}`);
  const p1200 = build(bucket, `${folder}${base}_1200x1200.${ext}`);

  return {
    feedSrc: isMultiSizeEra ? p800 : legacyResized || legacy200,
    modalChain: isMultiSizeEra ? [p1200, original] : [original],
  };
}
