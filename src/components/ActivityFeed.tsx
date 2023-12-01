import React, { useEffect } from "react";
import { FixedSizeList as List } from "react-window";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
import NoContentCard from "./NoContentCard";
import AdComponent from "./AdSense/AdComponent";
import { RootState } from "../utils/store";
import { useAppDispatch } from "../utils/store";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";
import { Input } from "@mui/material";
import './activityFeed.css'

const POST_BATCH_SIZE = 10;
const AD_INTERVAL = 4; // Show an ad after every 4 posts

const ActivityFeed = () => {
  const dispatch = useAppDispatch();
  const posts = useSelector((state: RootState) => state.posts.posts);
  const loading = useSelector((state: RootState) => state.posts.loading);

  // Define the getPostsByTag function
  const getPostsByTag = async (hashTag: string) => {
    // Logic to fetch posts by tag goes here
    console.log(`Fetching posts with hashtag: ${hashTag}`);
    // Perform your fetching logic and update the state as needed
  };

  // Fetch the initial posts when the component mounts
  useEffect(() => {
    dispatch(fetchInitialPostsBatch(POST_BATCH_SIZE));
  }, [dispatch]);

  // Determine the total item count (1 for the ad + number of posts)
  // const itemCount = 1 + posts.length;

  // Calculate the total number of items (posts + ads)
  const numberOfAds = Math.ceil(posts.length / AD_INTERVAL);
  const itemCount = posts.length + numberOfAds;

  const itemRenderer = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const adIndex = Math.floor((index + 1) / (AD_INTERVAL + 1));
    const isAdPosition = (index + 1) % (AD_INTERVAL + 1) === 0;
    const postIndex = index - adIndex; // Adjust the index to account for ads

    if (isAdPosition) {
      return <AdComponent key={`ad-${adIndex}`} style={style} />;
    } else if (postIndex < posts.length) {
      const post = posts[postIndex];
      return (
        <PostCardRenderer
          key={post.id}
          index={postIndex}
          style={style}
          data={{ post, getPostsByTag }}
        />
      );
    } else {
      // This block is for the case where the index is out of bounds
      // You could return null or a placeholder if you want to keep the spacing consistent
      return null;
    }
  };

  // If loading, show a loading indicator
  if (loading) {
    return <div>Loading...</div>;
  }

  // If there are no posts, show the no content card
  if (itemCount === 1) {
    return <NoContentCard />;
  }

  // Render the list with the ad at the top followed by posts
  return (
    <div className="activity-feed-container">
      <h5>Search by hashtag:</h5>
      <Input placeholder="search by hashtag"></Input><button color="white"></button>
      <List
        height={window.innerHeight}
        itemCount={itemCount}
        itemSize={900} // Adjust based on your item size
        width={650}
        itemData={{
          posts: posts,
          getPostsByTag: getPostsByTag, // Pass the function here
        }}
      >
        {itemRenderer}
      </List>
    </div>
  );
};

export default ActivityFeed;
