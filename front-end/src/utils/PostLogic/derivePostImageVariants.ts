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

export interface ImageVariants {
  p200?: string;
  p800?: string;
  p1200?: string;
  original?: string;
}

export function derivePostImageVariants(post: {
  imageUrl?: string;
  originalImageUrl?: string;
}): ImageVariants {
  const original = post.originalImageUrl || post.imageUrl;
  if (!original) return {};

  const url = new URL(original);
  const encoded = decodeURIComponent(url.pathname.split("/o/")[1]);
  const slash = encoded.lastIndexOf("/");

  const folder = encoded.substring(0, slash + 1);
  const filename = encoded.substring(slash + 1);

  const ext = filename.split(".").pop() || "jpg";
  const base = filename.replace(/\.\w+$/, "");

  // 🔑 LEGACY DETECTION (THIS IS THE FIX)
  const isLegacy = filename.startsWith("resized");

  // New-style variants
  const p200 = build(`${folder}${base}_200x200.${ext}`);
  const p800 = build(`${folder}${base}_800x800.${ext}`);
  const p1200 = build(`${folder}${base}_1200x1200.${ext}`);

  // Legacy variants
  const legacyResized = build(`${folder}resized.${ext}`);
  const legacyResized200 = build(`${folder}resized_200x200.${ext}`);

  return {
    // Thumbnails
    p200: isLegacy ? legacyResized200 : p200,

    // FEED IMAGE
    // Legacy → resized.jpg
    // New → original_800x800.jpg
    p800: isLegacy ? legacyResized : p800,

    // Large (new only)
    p1200: isLegacy ? undefined : p1200,

    // Modal original
    original,
  };
}

