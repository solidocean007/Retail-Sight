import { getFunctions, httpsCallable } from "firebase/functions";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";

export const handlePostShare = async (postId: string): Promise<string> => {
  try {
    const functions = getFunctions();
    const createToken = httpsCallable(functions, "generatePostShareToken");

    // 1️⃣ Generate token & get long URL
    const result: any = await createToken({ postId });
    const longUrl = result.data.longUrl;

    // 2️⃣ Create doc in `/urls` to trigger the extension
    const urlDocRef = await addDoc(collection(db, "urls"), {
      url: longUrl,
    });

    // 3️⃣ Wait for extension to write shortUrl
    return new Promise((resolve, reject) => {
      const unsub = onSnapshot(urlDocRef, (snap) => {
        const data = snap.data();
        if (!data) return;

        if (data.shortUrl) {
          unsub();
          resolve(data.shortUrl);
        }

        if (data.error) {
          unsub();
          reject(data.error);
        }
      });
    });
  } catch (error) {
    console.error("Error generating share link:", error);
    throw error;
  }
};

