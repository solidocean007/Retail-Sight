// resolvePostImage.ts — Corrected Version (800 + 600 + legacy-safe)
// Ensures mobile NEVER picks 200px first again.

const BUCKET = "retail-sight.appspot.com";

function buildDownloadUrl(path: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(
    path
  )}?alt=media`;
}

export function resolvePostImage(post: {
  imageUrl?: string;
  originalImageUrl?: string;
}) {
  const original = post.originalImageUrl || post.imageUrl || "";
  if (!original) return { small: [], medium: [], original: [] };

  const url = new URL(original);
  const encodedFullPath = url.pathname.split("/o/")[1];
  const fullPath = decodeURIComponent(encodedFullPath);

  const last = fullPath.lastIndexOf("/");
  const folder = fullPath.substring(0, last + 1);
  const filename = fullPath.substring(last + 1);
  const ext = filename.split(".").pop() || "jpg";
  const base = filename.replace(/\.\w+$/, "");

  // ERA DETECTION
  const isOriginal = base === "original";
  const isResized = base === "resized";

  const era5 = fullPath.includes("_800x800") || fullPath.includes("_1200x1200");
  const era4 = isOriginal && !isResized;

  const era3or2 =
    filename === "resized.jpg" ||
    filename === "resized.jpeg" ||
    filename === "resized.png" ||
    filename.startsWith("resized_");

  const era1 =
    !era5 &&
    !era4 &&
    !era3or2 &&
    !isOriginal &&
    !isResized &&
    /\d{6,}/.test(base);

  const small: string[] = [];
  const medium: string[] = [];
  const orig: string[] = [original];

  // -------------------------------------------------------
  // ERA 5 — Modern (800/600/200/1200 exist)
  // -------------------------------------------------------
  if (era5) {
    const clean = base
      .replace("_800x800", "")
      .replace("_600x600", "")
      .replace("_1200x1200", "");

    // MOBILE: 800 → 600 → 200 → original
    small.push(
      buildDownloadUrl(`${folder}${clean}_800x800.jpg`),
      buildDownloadUrl(`${folder}${clean}_600x600.jpg`),
      buildDownloadUrl(`${folder}${clean}_200x200.jpg`),
      original
    );

    // DESKTOP: 1200 → 800 → 600 → original
    medium.push(
      buildDownloadUrl(`${folder}${clean}_1200x1200.jpg`),
      buildDownloadUrl(`${folder}${clean}_800x800.jpg`),
      buildDownloadUrl(`${folder}${clean}_600x600.jpg`),
      original
    );
  }

  // -------------------------------------------------------
  // ERA 4 — Only original + 200
  // -------------------------------------------------------
  else if (era4) {
    small.push(
      // 200px last, original first is better for this era
      original,
      buildDownloadUrl(`${folder}original_200x200.${ext}`)
    );
    medium.push(original);
  }

  // -------------------------------------------------------
  // ERA 3/2 — resized era (2024)
  // -------------------------------------------------------
  else if (era3or2 || isOriginal) {
    // MOBILE: use resized (bigger), then original, then tiny 200s
    small.push(
      buildDownloadUrl(`${folder}resized.${ext}`),          // ~1000px good
      original,                                             // fallback
      buildDownloadUrl(`${folder}resized_200x200.${ext}`),  // tiny
      buildDownloadUrl(`${folder}original_200x200.${ext}`)  // tiny
    );

    // DESKTOP:
    medium.push(
      buildDownloadUrl(`${folder}resized.${ext}`),
      original
    );
  }

  // -------------------------------------------------------
  // ERA 1 — timestamp era (only original + small variants)
  // -------------------------------------------------------
  else if (era1) {
    small.push(
      buildDownloadUrl(`${folder}${base}_resized.${ext}`),  // bigger
      original,                                             // full
      buildDownloadUrl(`${folder}${base}_200x200.${ext}`)   // tiny fallback
    );

    medium.push(
      buildDownloadUrl(`${folder}${base}_resized.${ext}`),
      original
    );
  }

  // -------------------------------------------------------
  // UNKNOWN catch-all
  // -------------------------------------------------------
  else {
    small.push(
      buildDownloadUrl(`${folder}${base}_800x800.${ext}`),
      buildDownloadUrl(`${folder}${base}_600x600.${ext}`),
      original,
      buildDownloadUrl(`${folder}${base}_200x200.${ext}`)
    );

    medium.push(
      buildDownloadUrl(`${folder}${base}_1200x1200.${ext}`),
      buildDownloadUrl(`${folder}${base}_800x800.${ext}`),
      buildDownloadUrl(`${folder}${base}_600x600.${ext}`),
      original
    );
  }

  return { small, medium, original: orig };
}
