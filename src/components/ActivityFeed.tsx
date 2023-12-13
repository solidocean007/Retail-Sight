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
import { PostType, PostWithID } from "../utils/types";
import { addPostsToIndexedDB, getPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { setPosts } from "../Slices/postsSlice";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../utils/firebase";

const POSTS_BATCH_SIZE = 20;
const AD_INTERVAL = 4; // Show an ad after every 4 posts

const ActivityFeed = () => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const currentUserCompany = currentUser?.company;
  console.log(
    currentUserCompany,
    currentUser,
    " : currentUserCompany, currentUser"
  );

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

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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

  useEffect(() => {
    const loadPosts = async () => {
      try {
        console.log('looking in indexDB');
        const cachedPosts = await getPostsFromIndexedDB();
        if (cachedPosts && cachedPosts.length > 0) {
          dispatch(setPosts(cachedPosts));
        } else if (currentUserCompany) {
          console.log('no posts in indexDB');
          // Dispatch the thunk action; Redux handles the promise
          dispatch(fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })).then((action) => {
            if (fetchInitialPostsBatch.fulfilled.match(action)) {
              // This is where you know the posts have been successfully fetched and added to the store
              // Now you can add them to IndexedDB
              addPostsToIndexedDB(action.payload.posts);
            }
          });
        }
      } catch (error) {
        console.error("Error fetching posts from IndexedDB:", error);
        if (currentUserCompany) {
          // Dispatch the thunk action again in case of error
          dispatch(fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany }));
        }
      }
    };
  
    loadPosts();
  
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const posts: PostWithID[] = snapshot.docs.map(doc => ({
        ...doc.data() as PostType,
        id: doc.id,
      }));
  
      dispatch(setPosts(posts)); // Update Redux store
      addPostsToIndexedDB(posts); // Update IndexedDB
    });
  
    return () => unsubscribe();
  }, [dispatch, currentUserCompany]);
  
  

  const numberOfAds = Math.ceil(displayPosts.length / AD_INTERVAL) - 1;
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
      <div className="search-title">{/* <h5>Search by hashtag:</h5> */}</div>

      <div className="hashtag-search-box">
        {/* call the handleHashtagSearch on submit */}
        <Input
          placeholder="Search by hashtag"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleHashtagSearch();
            }
          }}
        />
        <button
          className="search-button"
          onClick={handleHashtagSearch}
          color="white"
        >
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
