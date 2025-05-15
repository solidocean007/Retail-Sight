// utils/imageSizingHelper.ts

/**
 * Analyze the orientation of an image file
 * and return optimized width/height pairs for
 * original and resized versions.
 */
export const getOptimizedSizes = async (file: File) => {
  const image = new Image();
  image.src = URL.createObjectURL(file);

  await new Promise<void>((resolve) => {
    image.onload = () => resolve();
  });

  const isPortrait = image.height > image.width;

  return {
    original: isPortrait ? [1600, 2400] : [2400, 1600],
    resized: isPortrait ? [1200, 1800] : [1800, 1200],
  };
};
