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
import { fetchLatestPosts, setPosts } from "../Slices/postsSlice";
import { incrementRead } from "../Slices/firestoreReadsSlice";
// import PostCard from "./PostCard";
import PostCardRenderer from "./PostCardRenderer";
import { fetchFilteredPosts } from "../Slices/postsSlice";
import { ChannelType } from "./ChannelSelector";
import { CategoryType } from "./CategorySelector";
import NoContentCard from "./NoContentCard";
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { selectAllPosts } from "../Slices/locationSlice";

interface ActivityFeedProps {
  selectedChannels: ChannelType[];
  selectedCategories: CategoryType[];
}

  // Define a memoized selector outside the component
  export const selectFilteredPosts = createSelector(
    [selectAllPosts, (state: RootState) => state.locations.selectedStates, (state: RootState) => state.locations.selectedCities],
    (posts, selectedStates, selectedCities) => {
      return posts.filter(post => {
        const matchesState = selectedStates.length === 0 || selectedStates.includes(post.state);
        const matchesCity = selectedCities.length === 0 || selectedCities.includes(post.city);
        return matchesState && matchesCity;
      });
    }
  );
  
  

const ActivityFeed: React.FC<ActivityFeedProps> = ({ selectedChannels, selectedCategories }) => {
   const { lastVisible } = useSelector((state: RootState) => ({
     lastVisible: state.posts.lastVisible,
   }));
  const filteredPosts = useSelector(selectFilteredPosts); // Use the selector in your component
  const dispatch = useDispatch<AppDispatch>();


  useEffect(() => {
    if (selectedChannels.length === 0 && selectedCategories.length === 0) {
      console.log('fetch latest posts')
      dispatch(fetchLatestPosts());
    } else {
      dispatch(fetchFilteredPosts({
        filters: {
          channels: selectedChannels,
          categories: selectedCategories,
        },
        lastVisible: lastVisible, // Assuming `lastVisible` is defined in your component's scope
        
      }));
    }
  }, [ lastVisible, dispatch ]);
  


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
