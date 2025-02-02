import { collection, query, where, getDocs } from "firebase/firestore"; // Ensure proper imports
import { db } from "../firebase"; // Ensure this exports the Firestore instance created via `getFirestore()`

const fetchPostsForGoal = async (goalId: string, goalType: 'companyGoals' | 'galloGoals') => {
  const postsSnapshot = await db
    .collection("posts")
    .where("goalId", "==", goalId)
    .where("goalType", "==", goalType)
    .get();

  return postsSnapshot.docs.map((doc) => ({
    id: doc.id, // Add the document ID as `id`
    ...doc.data(), // Spread the data to include all properties
  })) as PostType[]; // Explicitly cast to PostType[]
};


export default fetchPostsForGoal;