// resolvePostImage.ts — FINAL VERSION

const BUCKET = "retail-sight.appspot.com";

function build(path: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

export interface ImageSet {
  small: string[];
  medium: string[];
  original: string[];
}

export function resolvePostImage(post: {
  imageUrl?: string;
  originalImageUrl?: string;
}): ImageSet {
  const original = post.originalImageUrl || post.imageUrl || "";
  if (!original) return { small: [], medium: [], original: [] };

  const url = new URL(original);
  const encoded = decodeURIComponent(url.pathname.split("/o/")[1]);
  const slash = encoded.lastIndexOf("/");

  const folder = encoded.substring(0, slash + 1);
  const filename = encoded.substring(slash + 1);

  const ext = filename.split(".").pop() || "jpg";
  const base = filename.replace(/\.\w+$/, "");

  // Always construct URLs even if they don't exist; FadeImage handles fallback.
  const p200 = `${folder}${base}_200x200.${ext}`;
  const p800 = `${folder}${base}_800x800.${ext}`;
  const p1200 = `${folder}${base}_1200x1200.${ext}`;

  return {
    small: [build(p200)],                 // placeholder
    medium: [build(p800), build(p1200), original], // progressive upgrade
    original: [original]
  };
}
