// fetchUserDataFromFirestore
import { doc, getDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export const fetchUserDocFromFirestore= async (uid: string) => {
  const userRef = doc(collection(db, 'users'), uid);
  console.log('fetchUserDocFromFirestore from firestore read')
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    console.error("No such user!");
    return null;
  }
}

