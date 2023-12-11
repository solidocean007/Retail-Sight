import React, { useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
import NoContentCard from "./NoContentCard";
import AdComponent from "./AdSense/AdComponent";
import { RootState } from "../utils/store";
import { useAppDispatch } from "../utils/store";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";
import { Input } from "@mui/material";
import getPostsByTag from "../utils/PostLogic/getPostsByTag";
import "./activityFeed.css";
import { PostWithID } from "../utils/types";

const POSTS_BATCH_SIZE = 20;
const AD_INTERVAL = 4; // Show an ad after every 4 posts

const ActivityFeed = () => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const currentUserCompany = currentUser?.company;
  console.log(currentUserCompany, currentUser, " : currentUserCompany, currentUser");

  // State to store the window width
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<PostWithID[] | null>(
    null
  );

  const posts = useSelector((state: RootState) => state.posts.posts); // this is all posts in redux right?
  const loading = useSelector((state: RootState) => state.posts.loading);

  // Determine which posts to display - search results or all posts
  const displayPosts = searchResults ? searchResults : posts;

  const handleHashtagSearch = async () => {
    try {
      const hashtagPosts = await getPostsByTag(searchTerm);
      setSearchResults(hashtagPosts);
    } catch (error) {
      console.error("Error searching posts by hashtag:", error);
      // Optionally show an error message to the user
    }
  };

   // Effect to update the window width on resize
   useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate the width for the FixedSizeList
  const getListWidth = () => {
    if (windowWidth <= 480) {
      return windowWidth - 20; // Subtract some pixels for padding/margin
    } else if (windowWidth <= 768) {
      return Math.min(650, windowWidth - 20);
    }
    return 650;
  };

  // Fetch the initial posts when the component mounts
  useEffect(() => {
    console.log('ActivityFeed.tsx mounts')
    if (currentUserCompany) {
      dispatch(
        fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
      );
    }
    return () => {
      console.log("ActivityFeed.tsx unmounts");
    };
  }, [dispatch, currentUserCompany]);
  // }, []);

  // Determine the total item count (1 for the ad + number of posts)
  // const itemCount = 1 + posts.length;

  // Calculate the number of items (posts + ads)
  const numberOfAds = Math.ceil(displayPosts.length / AD_INTERVAL)-1;
  const itemCount = displayPosts.length + numberOfAds;

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
    } else if (postIndex < displayPosts.length) {
      const postWithID = displayPosts[postIndex];
      return (
        <PostCardRenderer
          key={postWithID.id}
          currentUserUid={currentUser?.uid}
          index={postIndex}
          style={style}
          data={{ post: postWithID, getPostsByTag }} // Passing the entire postWithID object
        />
      );
    } else {
      return null; // For out of bounds index
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
    <div className="activity-feed-box">
      <div className="search-title">
        {/* <h5>Search by hashtag:</h5> */}
      </div>

      <div className="hashtag-search-box">
        {/* call the handleHashtagSearch on submit */}
        <Input
          placeholder="Search by hashtag"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleHashtagSearch();
            }
          }}
        />
        <button onClick={handleHashtagSearch} color="white">
          Search
        </button>
      </div>

      <List
        // height={window.innerHeight}
        className="list-card"
        height={650}
        itemCount={itemCount}
        itemSize={900} // Adjust based on your item size
        width={getListWidth()}
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