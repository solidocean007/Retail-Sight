// utils/uploadUserAvatar.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export const MAX_AVATAR_FILE_SIZE = 8 * 1024 * 1024;
export const SUPPORTED_AVATAR_TYPES: readonly string[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * Uploads both original and cropped avatar images.
 * @param originalFile The raw image file selected by the user
 * @param croppedBlob A blob from the cropped canvas
 * @param userId Firebase UID
 */
export const uploadUserAvatar = async (
  originalFile: File,
  croppedBlob: Blob,
  userId: string,
): Promise<{
  profileUrlOriginal: string;
  profileUrlThumbnail: string;
}> => {
  if (!SUPPORTED_AVATAR_TYPES.includes(originalFile.type)) {
    throw new Error("Unsupported avatar image type.");
  }

  if (originalFile.size > MAX_AVATAR_FILE_SIZE) {
    throw new Error("Avatar image exceeds the 8 MB limit.");
  }

  // Reference paths
  const originalRef = ref(storage, `userImages/${userId}/original.jpg`);
  const thumbnailRef = ref(storage, `userImages/${userId}/thumbnail.jpg`);

  // Upload both
  await Promise.all([
    uploadBytes(originalRef, originalFile, {
      cacheControl: "private,max-age=3600",
      contentType: originalFile.type,
    }),
    uploadBytes(thumbnailRef, croppedBlob, {
      cacheControl: "private,max-age=3600",
      contentType: "image/jpeg",
    }),
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
