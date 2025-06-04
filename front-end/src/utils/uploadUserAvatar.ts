// utils/uploadUserAvatar.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const uploadUserAvatar = async (
  file: File,
  userId: string
): Promise<string> => {
  if (!file || !userId) throw new Error("Missing file or user ID");

  const storage = getStorage();
  const avatarRef = ref(storage, `userImages/${userId}`);

  await uploadBytes(avatarRef, file);
  const downloadURL = await getDownloadURL(avatarRef);

  return downloadURL; // You can now save this to user.profileUrl in Firestore
};
