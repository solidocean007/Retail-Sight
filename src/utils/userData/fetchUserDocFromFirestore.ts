// fetchUserDataFromFirestore
import { doc, getDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export const fetchUserDocFromFirestore= async (uid: string) => {
  const userRef = doc(collection(db, 'users'), uid); // should I pas the userRef into this function to reduce reading it from firestore
  console.log('fetchUserDocFromFirestore from firestore read')
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    console.error("No such user!");
    return null;
  }
}