import React, { useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { AppDispatch } from "../utils/store";
import { useSelector, useDispatch } from "react-redux";
import { setPosts } from "../Slices/postsSlice";
import { incrementRead } from "../Slices/firestoreReadsSlice";
// import PostCard from "./PostCard";
import PostCardRenderer from "./PostCardRenderer";
import { fetchAllPosts } from "../Slices/postsSlice";

interface Post {
  id: string;
  // ... other post attributes
}

interface ActivityFeedProps {
  selectedChannel: string;
  selectedCategory: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ selectedChannel, selectedCategory }) => {
  const allPosts: Post[] = useSelector((state: any) => state.posts); // unknown any specify a different type
  const dispatch: AppDispatch = useDispatch();

  useEffect(() => {
    async function fetchPosts() {
      const fetchedPosts = await dispatch(fetchAllPosts({
        filters: {
          channel: selectedChannel,
          category: selectedCategory
          // You can add other filters like city and state as needed
        }
      }));
      
      // Ensure the promise resolved successfully and we have data
      if (fetchAllPosts.fulfilled.match(fetchedPosts)) {
        dispatch(setPosts(fetchedPosts.payload));
      }
    }

    fetchPosts();
}, [selectedChannel, selectedCategory, dispatch]);



  const getPostsByTag = async (hashTag: string) => {
    console.log(`Fetching posts with hashtag: ${hashTag}`);
    const db = getFirestore();
    const postCollection = collection(db, "posts");
    const postsByTagQuery = query(
      postCollection,
      where("hashtags", "array-contains", hashTag)
    );

    try {
      const postSnapshot = await getDocs(postsByTagQuery);
      console.log(`Fetched ${postSnapshot.docs.length} posts by hashtag.`);
      dispatch(incrementRead(postSnapshot.docs.length));

      const postData = postSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      dispatch(setPosts(postData));
    } catch (error) {
      console.error("Error fetching posts by hashtag:", error);
    }
  };

  return (
    <List
      height={window.innerHeight} // or any height you desire for the feed viewport
      itemCount={allPosts.length}
      itemSize={900} // from your CSS
      width={650} // a bit more than the card's width to account for potential scrollbars and padding
      itemData={{
        posts: allPosts,
        getPostsByTag: getPostsByTag,
        // ... any other data or methods you need to pass
      }}
    >
      {PostCardRenderer}
    </List>
  );
};

export default ActivityFeed;
