// fetchUserDocFromFirestore
import { doc, getDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { incrementRead } from '../../Slices/firestoreReadsSlice';
import { AppDispatch } from '../store';

export const fetchUserDocFromFirestore = async (uid: string, dispatch: AppDispatch) => {
  const userRef = doc(collection(db, 'users'), uid);

  // Log Firestore read with timestamp
  dispatch(incrementRead({ 
    source: 'fetchUserDocFromFirestore', 
    description: `Fetching user data document for UID: ${uid}`,
    timestamp: new Date().toISOString() // ISO 8601 format timestamp
  }));

  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      console.error("No such user!");
      // Handle this case as needed
      return null;
    }
  } catch (error) {
    console.error("Error fetching user document:", error);
    // Handle or propagate the error as needed
    return null;
  }
}
