// fetchUserFromFirebase.ts
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

export const fetchUserFromFirebase = async (uid: string) => {
  const userDocRef = doc(db, "users", uid);
  const userDocSnapshot = await getDoc(userDocRef);
  return userDocSnapshot.data();
};
