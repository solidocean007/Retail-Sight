// updateFirestore.ts
import {
  // doc,
  // getDoc,
  // setDoc,
  // updateDoc,
  // arrayUnion,
  addDoc,
  collection,
  Firestore,
  DocumentReference,
} from "firebase/firestore";
import { PostInputType, PostType } from "../types";

export const addPostToFirestore = async (
  db: Firestore,
  postData: PostInputType,
): Promise<DocumentReference> => {
  const docRef = await addDoc(collection(db, "posts"), postData);
  return docRef; // This returns the DocumentReference
};


