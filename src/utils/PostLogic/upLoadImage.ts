// upLoadImage.ts
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

export const uploadImageToStorage = async (uid: string, selectedFile: File): Promise<string> => {
  const currentDate = new Date();
  const formattedDate = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
  
  const imageFileName = `${uid}-${Date.now()}.jpg`;
  const imagePath = `images/${formattedDate}/${uid}/${imageFileName}`;
  const storage = getStorage();
  const storageRef = ref(storage, imagePath);

  const uploadTask = uploadBytesResumable(storageRef, selectedFile);
  let downloadURL = '';

  return new Promise((resolve, reject) => {
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
        downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};
