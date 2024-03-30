// isUserEmailRegistered.ts
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

const isUserEmailRegistered = async (email: string): Promise<boolean> => {
  const emailLowercase = email.toLowerCase();
  const q = query(collection(db, 'users'), where('email', '==', emailLowercase));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
};

export default isUserEmailRegistered;