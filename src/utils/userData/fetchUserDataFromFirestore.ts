import { getFirestore } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';

export const getUserDataFromFirestore = async (uid: string) => {
  const userRef = firestore.collection('users').doc(uid);
  const doc = await userRef.get();
  if (doc.exists) {
    return doc.data();
  } else {
    console.error("No such user!");
    return null;
  }
}
