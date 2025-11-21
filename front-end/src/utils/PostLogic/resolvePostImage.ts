// resolvePostImage.ts — Universal Legacy + Modern Image Resolver (Version B)
// Supports ALL eras (2023 → 2025+), returns fallback arrays of Firebase download URLs.
//
// Displaygram image eras:
//
// ERA 5 (2025+, new extension):
//   original.jpg
//   original_200x200.jpg
//   original_600x600.jpg
//   original_1200x1200.jpg
//
// ERA 4 (late 2025):
//   original.jpg
//   original_200x200.jpg
//
// ERA 3/2 (2024):
//   original.jpg
//   original_200x200.jpg
//   resized.jpg
//   resized_200x200.jpg
//
// ERA 1 (2023):
//   UID_TIMESTAMP.jpg or .webp
//   UID_TIMESTAMP_resized.jpg
//   UID_TIMESTAMP_200x200.jpg
//
// This resolver produces fallback arrays for small & medium.
// The consumer (image component) will attempt each in order on error.
//

const BUCKET = "retail-sight.appspot.com";

function buildDownloadUrl(path: string): string {
  // Firebase public download URL format:
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

export function resolvePostImage(post: {
  imageUrl?: string;
  originalImageUrl?: string;
}) {
  const original = post.originalImageUrl || post.imageUrl || "";
  if (!original) {
    return {
      small: [],
      medium: [],
      original: [],
    };
  }

  // Parse signed original to extract encoded path
  const url = new URL(original);
  const encodedFullPath = url.pathname.split("/o/")[1];
  const fullPath = decodeURIComponent(encodedFullPath); // "images/yyyy-mm-dd/<folder>/<file>"
  const lastSlash = fullPath.lastIndexOf("/");
  const folder = fullPath.substring(0, lastSlash + 1);
  const filename = fullPath.substring(lastSlash + 1);
  const ext = filename.split(".").pop() || "jpg";

  // Remove extension
  const base = filename.replace(/\.\w+$/, "");

  // -------------------------------------------------------
  // ERA DETECTION
  // -------------------------------------------------------

  const has600 = base.includes("_600x600");
  const has1200 = base.includes("_1200x1200");
  const has200 = base.includes("_200x200");
  const isOriginal = base === "original";
  const isResized = base === "resized";

  // ERA 5 — New extension (2025+)
  const era5 = fullPath.includes("_600x600") || fullPath.includes("_1200x1200");

  // ERA 4 — (2025-11) has only original + original_200x200
  const era4 = isOriginal && !isResized;

  // ERA 3/2 — (2024) stored resized.jpg or resized_200x200.jpg
  const era3or2 =
    filename === "resized.jpg" ||
    filename === "resized.jpeg" ||
    filename === "resized.png" ||
    filename.startsWith("resized_");

  // ERA 1 — random UID + timestamp names (no "original" or "resized" keywords)
  const era1 =
    !era5 &&
    !era4 &&
    !era3or2 &&
    !isOriginal &&
    !isResized &&
    /\d{6,}/.test(base); // heuristic: base contains timestamp-like numbers

  // -------------------------------------------------------
  // FALLBACK PATH GENERATION PER ERA
  // -------------------------------------------------------

  const smallList: string[] = [];
  const mediumList: string[] = [];
  const originalList: string[] = [original]; // Always include original signed URL

  // ----- ERA 5 -----
  if (era5) {
    const small = `${folder}${base.replace("_600x600", "").replace("_1200x1200", "")}_600x600.jpg`;
    const medium = `${folder}${base.replace("_600x600", "").replace("_1200x1200", "")}_1200x1200.jpg`;

    smallList.push(buildDownloadUrl(small));
    mediumList.push(buildDownloadUrl(medium));
  }

  // ----- ERA 4 (late 2025: original + original_200x200) -----
  else if (era4) {
    const small200 = `${folder}original_200x200.${ext}`;
    smallList.push(buildDownloadUrl(small200));

    // Medium falls back to original
    mediumList.push(original);
  }

  // ----- ERA 3/2 (2024: original + resized variants) -----
  else if (era3or2 || isOriginal) {
    const original200 = `${folder}original_200x200.${ext}`;
    const resized200 = `${folder}resized_200x200.${ext}`;
    const resized = `${folder}resized.${ext}`;

    // small fallback chain
    smallList.push(buildDownloadUrl(resized200));
    smallList.push(buildDownloadUrl(original200));

    // medium fallback chain
    mediumList.push(buildDownloadUrl(resized));
    mediumList.push(original); // fallback to signed original
  }

  // ----- ERA 1 (2023 random UID/timestamp filenames) -----
  else if (era1) {
    const base200 = `${folder}${base}_200x200.${ext}`;
    const baseResized = `${folder}${base}_resized.${ext}`;

    smallList.push(buildDownloadUrl(base200));
    mediumList.push(buildDownloadUrl(baseResized));

    // Fallback to original
    smallList.push(original);
    mediumList.push(original);
  }

  // ----- unknown edge case (extremely defensive) -----
  else {
    // Try typical patterns before giving up
    smallList.push(buildDownloadUrl(`${folder}${base}_200x200.${ext}`));
    mediumList.push(buildDownloadUrl(`${folder}${base}_600x600.${ext}`));
    mediumList.push(original);
  }

  return {
    small: smallList,
    medium: mediumList,
    original: originalList,
  };
}
