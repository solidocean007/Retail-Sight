// resizeImages.ts
export const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality = 0.95): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      let width = image.width;
      let height = image.height;
      let resizeNeeded = width > maxWidth || height > maxHeight;

      // Calculate the new dimensions while maintaining the aspect ratio
      if (resizeNeeded) {
        const aspectRatio = width / height;
        if (width > height) {
          // Landscape
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          // Portrait
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = resizeNeeded ? width : image.width;
      canvas.height = resizeNeeded ? height : image.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas Context 2D is not available'));
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Output as PNG
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null, image cannot be created'));
        }
      }, 'image/png', quality); // PNG format
    };
    image.onerror = () => {
      reject(new Error('Image loading error'));
    };
  });
};

