// upLoadImage.ts
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import Compressor from 'compressorjs';

export const uploadImageToStorage = async (uid: string, selectedFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Compress the image
    new Compressor(selectedFile, {
      quality: 0.6, // Adjust as per your requirement
      async success(result) {
        await handleFirebaseUpload(uid, result as File, resolve, reject);
      },
      error(err) {
        console.log(err.message);
        reject(`Error compressing image. Please try again.`);
      },
    });
  });
};

const handleFirebaseUpload = async (uid: string, file: File, resolve: (value: string) => void, reject: (reason: string) => void) => { //
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
    }
  );
};