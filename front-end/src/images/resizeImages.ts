// resizeImages.ts
export const resizeImage = (file: File, maxWidth: number, maxHeight: number, quality = 0.95): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(image.src);
      let width = image.width;
      let height = image.height;

      // Check if the image exceeds the "super large" dimensions.
      const isSuperLarge = width > maxWidth || height > maxHeight;

      // Calculate the new dimensions while maintaining the aspect ratio
      if (isSuperLarge) {
        const aspectRatio = width / height;
        if (aspectRatio > 1) {
          // Landscape
          width = maxWidth;
          height = Math.round(width / aspectRatio);
        } else {
          // Portrait
          height = maxHeight;
          width = Math.round(height * aspectRatio);
        }
      }

      if (!isSuperLarge) {
        // If the image is not super large, resolve with the original file blob.
        resolve(file.slice());
      } else {
        // Resize the image using canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas Context 2D is not available'));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob returned null, image cannot be created'));
          }
        }, 'image/jpeg', quality);
      }
    };
    image.onerror = () => {
      reject(new Error('Image loading error'));
    };
  });
};
