import React, { useEffect, useRef, useState } from "react";
// import { FixedSizeList as List } from "react-window";
import { VariableSizeList as List } from "react-window";
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
import {
  addPostsToIndexedDB,
  getPostsFromIndexedDB,
  removePostFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { deletePost, mergeAndSetPosts, setPosts } from "../Slices/postsSlice";
import {
  DocumentChange,
  QuerySnapshot,
  collection,
  // doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import useProtectedAction from "../utils/useProtectedAction";

const POSTS_BATCH_SIZE = 20;
const AD_INTERVAL = 4; // Show an ad after every 4 posts
const BASE_ITEM_HEIGHT = 900; // Base height for a post item


const ActivityFeed = () => {
  const protectedAction = useProtectedAction();
  const listRef = useRef<List>(null);
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  console.log(currentUser, ' : currentUser')
  // Add a new state to track which posts are expanded
  const currentUserCompany = currentUser?.company;

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

  // New function to fetch public posts
  

  // Function to get the dynamic height of each item
  const getItemSize = (index: number) => {
    // Determine if the current index is an ad
    const isAdPosition = (index + 1) % (AD_INTERVAL + 1) === 0;
    if (isAdPosition) {
      return BASE_ITEM_HEIGHT; // Set the height for the ad item
    }
    return BASE_ITEM_HEIGHT; // Set the base height for a regular post item
  };

  const hashtagSearch = async () => {
    try {
      const hashtagPosts = await getPostsByTag(searchTerm);
      setSearchResults(hashtagPosts);
    } catch (error) {
      console.error("Error searching posts by hashtag:", error);
      // Optionally show an error message to the user
    }
  };

  const handleHashtagSearch = () => {
    protectedAction(()=> {
      hashtagSearch();
    })
  }

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

  // load indexDB posts or fetch from firestore
  useEffect(() => {
    const noUserLoggedInFetch = async () => { // this should use callback?
      const publicPostsQuery = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("timestamp", "desc"),
        limit(POSTS_BATCH_SIZE) // You can adjust the number of posts to fetch
      );
      const querySnapshot = await getDocs(publicPostsQuery);
      const publicPosts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as PostType }));
      dispatch(setPosts(publicPosts as PostWithID[])); // Update your Redux store with the fetched posts
    };
    if (currentUser === null) {
      noUserLoggedInFetch().catch(console.error);
      return
    }
    const loadPosts = async () => {
      try {
        console.log("looking in indexDB");
        const cachedPosts = await getPostsFromIndexedDB();
        if (cachedPosts && cachedPosts.length > 0) {
          console.log('getting posts from indexedDB')
          dispatch(setPosts(cachedPosts));
        } else if (currentUserCompany) {
          console.log("no posts in indexDB");
          // Dispatch the thunk action; Redux handles the promise
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
          ).then((action) => {
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
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
          );
        }
      }
    };

    loadPosts();
  }, [currentUser, dispatch, currentUserCompany]);

  // const mergePosts = (posts1: PostWithID[], posts2: PostWithID[]) => {
  //   // Combine the two arrays
  //   const combinedPosts = [...posts1, ...posts2];

  //   // Sort the combined array by timestamp (newest first)
  //   combinedPosts.sort((a, b) => {
  //     // Handle cases where timestamp might be undefined
  //     const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
  //     const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

  //     return timeB - timeA;
  //   });

  //   return combinedPosts;
  // };

  // Function to update the feed
  // const updateFeed = useCallback(
  //   (newPosts: PostWithID[], isPublic: boolean) => {
  //     const existingPosts = isPublic ? companyPosts : publicPosts;
  //     const mergedPosts = mergePosts(newPosts, existingPosts);
  //     dispatch(setPosts(mergedPosts)); // Update Redux store
  //     addPostsToIndexedDB(mergedPosts); // Update IndexedDB
  //   },
  //   [dispatch, publicPosts, companyPosts]
  // );

  // const updateFeed = useCallback(
  //   (newPosts: PostWithID[]) => {
  //     // Dispatch an action to merge newPosts with existing posts in Redux store
  //     dispatch(mergeAndSetPosts(newPosts)); // This action handles merging logic
  //     // Update IndexedDB with the merged posts
  //     addPostsToIndexedDB(newPosts); // Ensure new posts are also added to IndexedDB
  //   },
  //   [dispatch]
  // );
  
  // listen for new or updated posts
  useEffect(() => {
    // Capture the mount time in ISO format
    const mountTime = new Date().toISOString();
    const userCompany = currentUser?.company;
  
    // Function to process document changes
  const processDocChanges = (snapshot: QuerySnapshot) => {
    console.log('hook has heard a change') // i liked a post and added a comment to a post.  this never logged
    const changes = snapshot.docChanges();
    changes.forEach((change : DocumentChange) => {
      const postData = { id: change.doc.id, ...change.doc.data() as PostType };
      console.log(change)
      if (change.type === "added" || change.type === "modified") {
        // Dispatch an action to merge this post with existing posts in Redux store
        dispatch(mergeAndSetPosts([postData])); // Assuming mergeAndSetPosts is a redux action that handles the merge logic
      } else if (change.type === "removed") {
        // Dispatch an action to remove the post from Redux store
        dispatch(deletePost(change.doc.id));
        // Call a function to remove the post from IndexedDB
        removePostFromIndexedDB(change.doc.id);
      }
    });
  };
  
    // Subscribe to public posts
    const publicPostsQuery = query(
      collection(db, "posts"),
      where("visibility", "==", "public"),
      where('timestamp', '>', mountTime),
      orderBy("timestamp", "desc")
    );
    const unsubscribePublic = onSnapshot(publicPostsQuery, processDocChanges);
  
    // Subscribe to company-specific posts, if the user's company is known
    let unsubscribeCompany = () => {};
    if (userCompany) {
      const companyPostsQuery = query(
        collection(db, "posts"),
        where("user.postUserCompany", "==", userCompany),
        where('timestamp', '>', mountTime),
        orderBy("timestamp", "desc")
      );
      unsubscribeCompany = onSnapshot(companyPostsQuery, processDocChanges);
    }
  
    // Cleanup function
    return () => {
      unsubscribePublic();
      unsubscribeCompany();
    };
  }, [currentUser?.company, dispatch]);
  
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
        ref={listRef}
        className="list-card"
        height={650}
        itemCount={itemCount}
        itemSize={getItemSize} // Adjust based on your item size
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