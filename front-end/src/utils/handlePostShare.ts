// handlePostShare.ts

import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../utils/firebase";

export const handlePostShare = async (longUrl: string): Promise<string> => {
  try {

    // 🚫 BITLY DISABLED TEMPORARILY
    // return the long URL instantly for now
    return longUrl;

    // ---- ORIGINAL BITLY LOGIC BELOW (commented out, preserved) ----
    /*
    const urlDocRef = await addDoc(collection(db, "urls"), {
      url: longUrl,
    });

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
    */
  } catch (error) {
    console.error("Error generating share link:", error);
    return longUrl; // fallback
  }
};

