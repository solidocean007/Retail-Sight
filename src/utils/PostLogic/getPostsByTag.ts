import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { PostType, PostWithID } from "../types";

// Define the function to fetch posts by a hashtag
export const getPostsByTag = async (hashTag: string): Promise<PostWithID[]> => {
  try {
    // Define the reference to the posts collection
    const postsCollectionRef = collection(db, "posts");

    // Create a query to fetch posts where the 'hashtags' array field contains the provided hashtag
    const postsQuery = query(postsCollectionRef, where("hashtags", "array-contains", hashTag));

    const snapshots = await getDocs(postsQuery);
    
    // Map each document to a PostWithID
    return snapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as PostType // Spread the properties of PostType directly
    })) as PostWithID[]; // Assert that the resulting array is of type PostWithID[]
  } catch (error) {
    console.error("Error fetching posts by hashtag:", error);
    throw error; // Or handle the error as needed
  }
};

export default getPostsByTag;
