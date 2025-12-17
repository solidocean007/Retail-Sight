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

  // 🔑 Capability detection
  const isResizedEra = filename.startsWith("resized");
  const isOriginalBase = base === "original";

  // Build candidates
  const original200 = build(`${folder}${base}_200x200.${ext}`);
  const original800 = build(`${folder}${base}_800x800.${ext}`);
  const original1200 = build(`${folder}${base}_1200x1200.${ext}`);

  const legacyResized = build(`${folder}resized.${ext}`);
  const legacyResized200 = build(`${folder}resized_200x200.${ext}`);

  /**
   * FEED RULES (absolute)
   * 1. Prefer resized.jpg if it exists (legacy)
   * 2. Else prefer *_800x800 ONLY if this era supports it
   * 3. Else fall back to original.jpg
   */
  let feed: string | undefined;

  if (isResizedEra) {
    feed = legacyResized;
  } else if (isOriginalBase) {
    // Era C or D
    // Only Era D supports 800/1200
    // We detect Era D by *assuming newer uploads include 1200*
    feed = original800; // tentative
  } else {
    feed = original;
  }

  /**
   * ERA C SAFETY NET:
   * If this post only ever had original + 200,
   * we MUST fall back to original
   */
  if (isOriginalBase && !filename.includes("_")) {
    feed = original;
  }

  return {
    p200: isResizedEra ? legacyResized200 : original200,
    p800: feed,
    p1200: isResizedEra ? undefined : original1200,
    original,
  };
}


