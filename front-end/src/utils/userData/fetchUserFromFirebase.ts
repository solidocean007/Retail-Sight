// fetchUserFromFirebase.ts
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export const fetchUserFromFirebase = async (uid: string) => {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnapshot = await getDoc(userDocRef);

    if (!userDocSnapshot.exists()) {
      console.log("User not found");
      return null;
    }

    return userDocSnapshot.data();
  } catch (error) {
    console.error("Error fetching user from Firebase:", error);
    return null;
  }
};
