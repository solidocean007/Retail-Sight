import { doc, getDoc, setDoc, updateDoc, arrayUnion, addDoc, collection } from "firebase/firestore";

export const addPostToFirestore = async (db: any, postData: any) => {
  return await addDoc(collection(db, "posts"), postData);
};

export const updateChannelsInFirestore = async (db: any, channel: string, postId: string) => {
  const channelRef = doc(db, "channels", channel);
  console.log('update channels in firestore read')
  const channelDoc = await getDoc(channelRef);
  
  if (channelDoc.exists()) {
    await updateDoc(channelRef, {
      postIds: arrayUnion(postId),
    });
  } else {
    await setDoc(channelRef, {
      postIds: [postId]
    });
  }
};

export const updateCategoriesInFirestore = async (db: any, category: string, postId: string) => {
  const categoryRef = doc(db, "categories", category);
  console.log('update categories in firestore read')
  const categoryDoc = await getDoc(categoryRef);
  
  if (categoryDoc.exists()) {
    await updateDoc(categoryRef, {
      postIds: arrayUnion(postId),
    });
  } else {
    await setDoc(categoryRef, {
      postIds: [postId]
    });
  }
};

