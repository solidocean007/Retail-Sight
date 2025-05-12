// upLoadImage.ts
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import Compressor from "compressorjs";
import { resizeImage } from "../../images/resizeImages";

export const uploadImageToStorage = (
  uid: string,
  selectedFile: File,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Call resizeImage with type assertion if needed
    resizeImage(selectedFile, 500, 600)
      .then((resizedImage) => {
        // Ensure that Compressor is set to receive Blob type
        new Compressor(resizedImage as Blob, {
          // Cast to Blob if necessary
          quality: 0.95,
          success(result) {
            handleFirebaseUpload(uid, result as File, resolve, reject);
          },
          error(err) {
            reject(`Error compressing image: ${err.message}`);
          },
        });
      })
      .catch((err) => {
        reject(
          `Error resizing image: ${err instanceof Error ? err.message : err}`,
        );
      });
  });
};

const handleFirebaseUpload = async (
  uid: string,
  file: File,
  resolve: (value: string) => void,
  reject: (reason: string) => void,
) => {
  //
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;

  const imageFileName = `${uid}-${Date.now()}.webp`; // Note the .webp extension
  const imagePath = `images/${formattedDate}/${uid}/${imageFileName}`;
  const storage = getStorage();
  const storageRef = ref(storage, imagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log("Upload is " + progress + "% done");
    },
    (error) => {
      reject(`Error uploading image. Please try again. ${error}`);
    },
    async () => {
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
      resolve(downloadURL);
    },
  );
};
