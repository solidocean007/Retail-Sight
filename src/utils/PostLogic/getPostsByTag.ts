import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { PostType } from "../types";

// Define the function to fetch posts by a hashtag
const getPostsByTag = async (hashTag: string) => {
  try {
    // Define the reference to the posts collection
    const postsCollectionRef = collection(db, "posts");

    // Create a query to fetch posts where the 'hashtags' array field contains the provided hashtag
    const postsQuery = query(postsCollectionRef, where("hashtags", "array-contains", hashTag));

    // Execute the query
    const querySnapshot = await getDocs(postsQuery);

    // Map the query results to an array of PostType objects
    const posts = querySnapshot.docs.map(doc => ({ // Conversion of type '{ id: string; }[]' to type 'PostType[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
      // Type '{ id: string; }' is missing the following properties from type 'PostType': category, channel, storeAddress, user, and 3 more.ts(2352)
      id: doc.id,
      ...doc.data()
    })) as PostType[];

    // Return the fetched posts
    return posts;
  } catch (error) {
    console.error("Error fetching posts by hashtag:", error);
    throw error; // Or handle the error as needed
  }
};

export default getPostsByTag;