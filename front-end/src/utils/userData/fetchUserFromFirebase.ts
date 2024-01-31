// fetchUserFromFirebase.ts
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
// import { useDispatch } from "react-redux";
import { incrementRead } from "../../Slices/firestoreReadsSlice";
import { AppDispatch } from "../store";

export const fetchUserFromFirebase = async (uid: string, dispatch: AppDispatch) => {
  // const dispatch = useDispatch();
  try {
    const userDocRef = doc(db, "users", uid);
    console.log('fetch user from firebase read');
    const userDocSnapshot = await getDoc(userDocRef);

    if (!userDocSnapshot.exists()) {
      console.log('User not found');
      return null; // or handle as appropriate
    }

    // Log Firestore read
    dispatch(incrementRead({ 
      source: 'fetchUserFromFirebase', 
      description: `Fetching user data for UID: ${uid}`,
      timestamp: new Date().toISOString() // ISO 8601 format timestamp
    }));

    return userDocSnapshot.data();
  } catch (error) {
    console.error('Error fetching user from Firebase:', error);
    // Handle the error appropriately
    return null;
  }
};