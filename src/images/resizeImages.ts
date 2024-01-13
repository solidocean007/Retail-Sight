// resizeImages.ts
// Function to resize an image using canvas
export const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(image.src); // Revoke the object URL after loading the image
      let width = image.width;
      let height = image.height;

      // Calculate the new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
      }

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
      // }, 'image/webp', 0.95); // Adjust the quality as needed
      }, 'image/jpeg', 0.95); // Adjust the quality as needed
    };
    image.onerror = () => {
      reject(new Error('Image loading error'));
    };
  });
};