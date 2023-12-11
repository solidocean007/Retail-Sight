// fetchUserDataFromFirestore
import { doc, getDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { incrementRead } from '../../Slices/firestoreReadsSlice';
import { AppDispatch } from '../store';

export const fetchUserDocFromFirestore= async (uid: string, dispatch: AppDispatch) => {
  const userRef = doc(collection(db, 'users'), uid); // should I pas the userRef into this function to reduce reading it from firestore
  console.log('fetchUserDocFromFirestore from firestore read')

   // Log Firestore read
   dispatch(incrementRead({ 
    source: 'fetchUserDocFromFirebase', 
    description: `Fetching user data document`
  }));
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    console.error("No such user!");
    return null;
  }
}