// fetchUserDocFromFirestore
import { doc, getDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export const fetchUserDocFromFirestore = async (uid: string) => {
  const userRef = doc(collection(db, "users"), uid);

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
};
