// resolvePostImage.ts — 200px REMOVED, blur-first ready

const BUCKET = "retail-sight.appspot.com";

function build(path: string) {
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
  const encoded = url.pathname.split("/o/")[1];
  const full = decodeURIComponent(encoded);

  const last = full.lastIndexOf("/");
  const folder = full.substring(0, last + 1);
  const filename = full.substring(last + 1);
  const ext = filename.split(".").pop() || "jpg";
  const base = filename.replace(/\.\w+$/, "");

  const is800 = full.includes("_800x800");
  const is600 = full.includes("_600x600");
  const is1200 = full.includes("_1200x1200");

  // Clean name base (era5)
  const clean = base
    .replace("_800x800", "")
    .replace("_600x600", "")
    .replace("_1200x1200", "");

  // Always return an array for small + medium
  const small: string[] = [];
  const medium: string[] = [];
  const orig = [original];

  // -------------------------------------------------------
  // ERA 5 — modern naming (800 / 600 / 1200 exist)
  // -------------------------------------------------------
  if (is800 || is600 || is1200) {
    small.push(
      build(`${folder}${clean}_800x800.jpg`),
      build(`${folder}${clean}_600x600.jpg`),
      original
    );

    medium.push(
      build(`${folder}${clean}_1200x1200.jpg`),
      build(`${folder}${clean}_800x800.jpg`),
      build(`${folder}${clean}_600x600.jpg`),
      original
    );
  }

  // -------------------------------------------------------
  // ERA 4 — only original + maybe 200 existed before
  // NOW: treat as 800 missing → original first
  // -------------------------------------------------------
  else if (base === "original") {
    small.push(original);
    medium.push(original);
  }

  // -------------------------------------------------------
  // ERA 3 / 2 — resized era (resized.jpg ~1000px)
  // -------------------------------------------------------
  else if (filename.startsWith("resized") || filename === "resized.jpg") {
    small.push(
      build(`${folder}resized.${ext}`),
      original
    );

    medium.push(
      build(`${folder}resized.${ext}`),
      original
    );
  }

  // -------------------------------------------------------
  // ERA 1 — timestamp-only era
  // Provide resized → original
  // -------------------------------------------------------
  else {
    small.push(
      build(`${folder}${base}_resized.${ext}`),
      original
    );

    medium.push(
      build(`${folder}${base}_resized.${ext}`),
      original
    );
  }

  return { small, medium, original: orig };
}
