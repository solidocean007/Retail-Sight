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
import { PostType } from "../types";

export const addPostToFirestore = async (
  db: Firestore,
  postData: PostType,
): Promise<DocumentReference> => {
  const docRef = await addDoc(collection(db, "posts"), postData);
  return docRef; // This returns the DocumentReference
};

// export const updateChannelsInFirestore = async (
//   db: Firestore,
//   channel: string,
//   postId: string,
// ) => {
//   const channelRef = doc(db, "channels", channel);
//   console.log("update channels in firestore read");
//   const channelDoc = await getDoc(channelRef);

//   if (channelDoc.exists()) {
//     await updateDoc(channelRef, {
//       postIds: arrayUnion(postId),
//     });
//   } else {
//     await setDoc(channelRef, {
//       postIds: [postId],
//     });
//   }
// };

// export const updateCategoriesInFirestore = async (
//   db: Firestore,
//   category: string,
//   postId: string,
// ) => {
//   const categoryRef = doc(db, "categories", category);
//   console.log("update categories in firestore read");
//   const categoryDoc = await getDoc(categoryRef);

//   if (categoryDoc.exists()) {
//     await updateDoc(categoryRef, {
//       postIds: arrayUnion(postId),
//     });
//   } else {
//     await setDoc(categoryRef, {
//       postIds: [postId],
//     });
//   }
// };
