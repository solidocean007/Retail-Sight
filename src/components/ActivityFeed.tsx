//ActivityFeed
import React, { useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { AppDispatch } from "../utils/store";
import { useSelector, useDispatch } from "react-redux";
import { setPosts } from "../Slices/postsSlice";
import { incrementRead } from "../Slices/firestoreReadsSlice";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
// import PostCard from "./PostCard";
import PostCardRenderer from "./PostCardRenderer";
// import { ChannelType } from "./ChannelSelector";
import { fetchLatestPosts } from "../thunks/postsThunks";
// import { CategoryType } from "./CategorySelector";
import NoContentCard from "./NoContentCard";
// import { createSelector } from "@reduxjs/toolkit";
// import { RootState } from "../utils/store";
// import { selectAllPosts } from "../Slices/locationSlice";
import { getPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
  
// Define the memoized selector
const selectFilteredPosts = createSelector(
  [
    (state: RootState) => state.posts.posts,
    (state: RootState) => state.locations.selectedStates,
    (state: RootState) => state.locations.selectedCities,
  ],
  (posts, selectedStates, selectedCities) => {
    return posts.filter((post) => {
      const matchesState =
        selectedStates.length === 0 || selectedStates.includes(post.state);
      const matchesCity =
        selectedCities.length === 0 || selectedCities.includes(post.city);
      return matchesState && matchesCity;
    });
  }
);

const ActivityFeed = () => {
  //  const { lastVisible } = useSelector((state: RootState) => ({
  //    lastVisible: state.posts.lastVisible,
  //  }));
  const filteredPosts = useSelector(selectFilteredPosts); // Use the selector in your component
  const dispatch = useDispatch<AppDispatch>();


  
  // useEffect(() => {
  //   dispatch(fetchLatestPosts());
  // }, [dispatch]);

  useEffect(() => {
    const loadPosts = async () => {
      // Load posts from IndexedDB
      const cachedPosts = await getPostsFromIndexedDB();

      if (cachedPosts.length > 0) {
        // If there are cached posts, dispatch an action to update the store
        dispatch(setPosts(cachedPosts)); // Assuming you have a setPosts action
      } else {
        // If IndexedDB is empty, fetch posts from Firestore
        dispatch(fetchLatestPosts());
      }

      // Optionally, after displaying cached data, check Firestore for new updates
      // and update both the Redux store and IndexedDB cache if needed
    };

    loadPosts();
  }, [dispatch]);
  


  const getPostsByTag = async (hashTag: string) => {
    console.log(`Fetching posts with hashtag: ${hashTag}`);
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
    <>
    {filteredPosts.length === 0 ? (
      <NoContentCard />
    ) : (
      <List
        className="list"
        height={window.innerHeight} // or any height you desire for the feed viewport
        itemCount={filteredPosts.length}
        itemSize={900} // from your CSS
        width={650} // a bit more than the card's width to account for potential scrollbars and padding
        itemData={{
          posts: filteredPosts,
          getPostsByTag: getPostsByTag,
          // ... any other data or methods you need to pass
        }}
      >
        {PostCardRenderer}
      </List>
    )}
  </>
  );
};

export default ActivityFeed;
