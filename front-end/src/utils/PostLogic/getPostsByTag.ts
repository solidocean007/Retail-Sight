// getPostsByTag
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { PostType, PostWithID } from "../types";

// Define the function to fetch posts by a hashtag
export const getPostsByTag = async (
  hashTag: string,
  usersCompanyID?: string,
): Promise<PostWithID[]> => {
  console.log("Searching for posts with hashTag:", hashTag);
  hashTag = hashTag.toLowerCase();
  try {
    const postsCollectionRef = collection(db, "posts");
    const postsQuery = query(
      postsCollectionRef,
      where("hashtags", "array-contains", hashTag),
      orderBy("displayDate", "desc"),
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
      const postCompanyID = post.createdBy.companyId;
      return postCompanyID === usersCompanyID; // what does this line do?  does it return a post that has a matching company id to the logged in user?
    });
    return filteredPosts;
  } catch (error) {
    console.error("Error fetching posts by hashtag:", error);
    throw error;
  }
};

export const getPostsByStarTag = async (
  starTag: string,
): Promise<PostWithID[]> => {
  try {
    starTag = starTag.toLowerCase();

    const postsCollectionRef = collection(db, "posts");
    const postsQuery = query(
      postsCollectionRef,
      where("starTags", "array-contains", starTag),
      orderBy("displayDate", "desc"),
    );
    const snapshots = await getDocs(postsQuery);

    const posts: PostWithID[] = snapshots.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as PostType),
    }));

    return posts;
  } catch (error) {
    console.error("Error fetching posts by starTag:", error);
    throw error;
  }
};
