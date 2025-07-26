// utils/uploadUserAvatar.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads both original and cropped avatar images.
 * @param originalFile The raw image file selected by the user
 * @param croppedBlob A blob from the cropped canvas
 * @param userId Firebase UID
 */
export const uploadUserAvatar = async (
  originalFile: File,
  croppedBlob: Blob,
  userId: string
): Promise<{
  profileUrlOriginal: string;
  profileUrlThumbnail: string;
}> => {
  // const storage = getStorage();

  // Reference paths
  const originalRef = ref(storage, `userImages/${userId}/original.jpg`);
  const thumbnailRef = ref(storage, `userImages/${userId}/thumbnail.jpg`);

  // Upload both
  await Promise.all([
    uploadBytes(originalRef, originalFile),
    uploadBytes(thumbnailRef, croppedBlob),
  ]);

  // Get public URLs
  const [originalUrl, thumbnailUrl] = await Promise.all([
    getDownloadURL(originalRef),
    getDownloadURL(thumbnailRef),
  ]);

  return {
    profileUrlOriginal: originalUrl,
    profileUrlThumbnail: thumbnailUrl,
  };
};
