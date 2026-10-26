const convertWithBrowserDecoder = (file: File): Promise<Blob | null> =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const finish = (blob: Blob | null) => {
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };

    image.onerror = () => finish(null);
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");
        if (!context || canvas.width === 0 || canvas.height === 0) {
          finish(null);
          return;
        }

        context.drawImage(image, 0, 0);
        canvas.toBlob(finish, "image/jpeg", 0.92);
      } catch {
        finish(null);
      }
    };

    image.src = objectUrl;
  });

export const convertHeicImage = async (file: File): Promise<Blob> => {
  // Safari and some installed PWAs can decode HEIC without a JavaScript
  // codec. Use that path first and only download the large fallback when the
  // browser proves it cannot decode this specific image.
  const browserConverted = await convertWithBrowserDecoder(file);
  if (browserConverted) return browserConverted;

  const { default: convertHeic } = await import("heic2any");
  const converted = await convertHeic({
    blob: file,
    toType: "image/jpeg",
  });

  return Array.isArray(converted) ? converted[0] : converted;
};
