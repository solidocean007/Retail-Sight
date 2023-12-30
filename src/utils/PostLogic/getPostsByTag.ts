// getPostsByTag
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { PostType, PostWithID } from "../types";

// Define the function to fetch posts by a hashtag
export const getPostsByTag = async (hashTag: string): Promise<PostWithID[]> => {
  try {
    const postsCollectionRef = collection(db, "posts");
    const postsQuery = query(postsCollectionRef, where("hashtags", "array-contains", hashTag));
    const snapshots = await getDocs(postsQuery);

    // Use a variable to store the mapped results
    const posts: PostWithID[] = snapshots.docs.map(doc => ({
      id: doc.id,
      ...doc.data() as PostType
    }));

    return posts; // Return the variable
  } catch (error) {
    console.error("Error fetching posts by hashtag:", error);
    throw error;
  }
};

export default getPostsByTag;

