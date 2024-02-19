// getPostsByTag
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { PostType, PostWithID } from "../types";

// Define the function to fetch posts by a hashtag
export const getPostsByTag = async (
  hashTag: string,
  usersCompanyID?: string,
): Promise<PostWithID[]> => {

  const lowerCaseHashTag = hashTag.toLowerCase();
  try {
    const postsCollectionRef = collection(db, "posts");
    const postsQuery = query(
      postsCollectionRef,
      where("hashtags", "array-contains", lowerCaseHashTag)
    );
    const snapshots = await getDocs(postsQuery);

    const posts: PostWithID[] = snapshots.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as PostType),
    }));

    // Filter posts based on company ID and visibility
    const filteredPosts = posts.filter((post) => {
      // Return the post if it is public
      if (post.visibility === "public") {
        return true;
      }

      // If usersCompanyID is undefined, do not return non-public posts
      if (usersCompanyID === undefined) {
        return false;
      }

      // Check if postUserCompanyID matches the user's company ID
      const postCompanyID = post.postUserCompanyId;
      return postCompanyID === usersCompanyID; // what does this line do?  does it return a post that has a matching company id to the logged in user?
    });
    console.log('hashtag search: ', filteredPosts)
    return filteredPosts;
  } catch (error) {
    console.error("Error fetching posts by hashtag:", error);
    throw error;
  }
};


export const getPostsByStarTag = async (
  starTag: string
): Promise<PostWithID[]> => {
  try {
    const postsCollectionRef = collection(db, "posts");
    const postsQuery = query(
      postsCollectionRef,
      where("starTags", "array-contains", starTag)
    );
    const snapshots = await getDocs(postsQuery);

    // Use a variable to store the mapped results
    const posts: PostWithID[] = snapshots.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as PostType),
    }));

    return posts; // Return the variable
  } catch (error) {
    console.error("Error fetching posts by hashtag:", error);
    throw error;
  }
};
