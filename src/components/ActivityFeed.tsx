import React, { useEffect, useRef, useState } from "react";
import { VariableSizeList as List } from "react-window";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
import NoContentCard from "./NoContentCard";
import AdComponent from "./AdSense/AdComponent";
import { RootState } from "../utils/store";
import { useAppDispatch } from "../utils/store";
import getPostsByTag from "../utils/PostLogic/getPostsByTag";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";
import "./activityFeed.css";
import { PostType, PostWithID } from "../utils/types";
import {
  addPostsToIndexedDB,
  getPostsFromIndexedDB,
  removePostFromIndexedDB,
  updatePostInIndexedDB,
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
import HashTagSearchBar from "./HashTagSearchBar";
import useScrollToPost from "../hooks/useScrollToPost";
import NewSection from "./NewSection";
import { openDB } from "../utils/database/indexedDBOpen";

const POSTS_BATCH_SIZE = 200; // ill reduce this later after i implement the batchMorePosts logic
const AD_INTERVAL = 4;
// const BASE_ITEM_HEIGHT = 900;

const ActivityFeed = () => {
  const [adsOn] = useState(false);

  const [currentHashtag, setCurrentHashtag] = React.useState<string | null>(
    null
  );
  const [searchResults, setSearchResults] = React.useState<PostWithID[] | null>(
    null
  );
  const posts = useSelector((state: RootState) => state.posts.posts);

  // Determine which posts to display - search results or all posts
  const displayPosts = searchResults ? searchResults : posts;
  const listRef = useRef<List>(null);
  useScrollToPost(listRef, displayPosts, AD_INTERVAL);
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  console.log(currentUser);
  const currentUserCompany = currentUser?.company;

  // State to store the window width
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // console.log(posts, ' : posts')
  const loading = useSelector((state: RootState) => state.posts.loading);

  async function removeGhostPostFromIndexedDB(postId: string) {
    const db = await openDB(); // openDB is a function to open your IndexedDB
    const tx = db.transaction("latestPosts", "readwrite");
    const store = tx.objectStore("latestPosts");

    await store.delete(postId);
  }

  const clearSearch = async () => {
    setCurrentHashtag(null);
    setSearchResults(null);
    // Reload posts from IndexedDB
    const cachedPosts = await getPostsFromIndexedDB();
    if (cachedPosts && cachedPosts.length > 0) {
      dispatch(setPosts(cachedPosts));
    }
  };

  // Function to get the dynamic height of each item
  const getItemSize = (index: number) => {
    const gapSize = 0;
    // Determine if the current index is an ad
    const isAdPosition = (index + 1) % (AD_INTERVAL + 1) === 0;
    if (isAdPosition && adsOn) {
      // return getActivityItemHeight(windowWidth) - 200; // Use the responsive height but how about change the height as well?
      return 200 + gapSize; // Use the responsive height but how about change the height as well?
    } else if (isAdPosition && !adsOn) {
      return 0;
    }
    return getActivityItemHeight(windowWidth) + gapSize; // Use the responsive height for regular post items as well
  };

  // Mount alert
  useEffect(() => {
    console.log("ActivityFeed mounts");
    removeGhostPostFromIndexedDB("QCawXVw6IjP7mkogJqrE");
    return () => {
      console.log("ActivityFeed.tsx unmounted");
    };
  });

  const getActivityItemHeight = (windowWidth: number) => {
    if (windowWidth <= 480) {
      // return 720;
      return 550;
    } else if (windowWidth <= 800) {
      return 700;
    } else if (windowWidth <= 900) {
      return 750;
    } else {
      return 800;
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
      return windowWidth - 25; // Subtract some pixels for padding/margin
    } else if (windowWidth <= 768) {
      return Math.min(650, windowWidth - 25);
    }
    return 650;
  };

  // load indexDB posts or fetch from firestore
  useEffect(() => {
    const noUserLoggedInFetch = async () => {
      // need to check indexedDB before doing this in case this user has visited the site before.
      const publicPostsQuery = query(
        collection(db, "posts"),
        where("visibility", "==", "public"),
        orderBy("timestamp", "desc"),
        limit(POSTS_BATCH_SIZE)
      );
      const querySnapshot = await getDocs(publicPostsQuery);

      const publicPosts: PostWithID[] = querySnapshot.docs
        .map((doc) => {
          const postData: PostType = doc.data() as PostType;
          return {
            ...postData,
            id: doc.id,
          };
        })
        .filter((post) => post.visibility === "public");
      // id: doc.id, ...doc.data() as PostType }));
      dispatch(setPosts(publicPosts as PostWithID[])); // Update your Redux store with the fetched posts
      addPostsToIndexedDB(publicPosts);
    };
    if (currentUser === null) {
      noUserLoggedInFetch().catch(console.error);
      return;
    }
    const loadPosts = async () => {
      try {
        const cachedPosts = await getPostsFromIndexedDB();
        if (cachedPosts && cachedPosts.length > 0) {
          // console.log("getting posts from indexedDB");
          dispatch(setPosts(cachedPosts));
        } else if (currentUserCompany) {
          // console.log("no posts in indexDB");
          // Dispatch the thunk action; Redux handles the promise
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
          ).then((action) => {
            if (fetchInitialPostsBatch.fulfilled.match(action)) {
              addPostsToIndexedDB(action.payload.posts);
            }
          });
        }
      } catch (error) {
        // console.error("Error fetching posts from IndexedDB:", error);
        if (currentUserCompany) {
          // Dispatch the thunk action again in case of error.  Is this a safe action to do?
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompany })
          );
        }
      }
    };

    loadPosts();
  }, [currentUser, dispatch, currentUserCompany]);

  // listen for new or updated posts
  useEffect(() => {
    // Capture the mount time in ISO format
    const mountTime = new Date().toISOString();
    const userCompany = currentUser?.company;

    // Function to process document changes
    const processDocChanges = (snapshot: QuerySnapshot) => {
      const changes = snapshot.docChanges();
      changes.forEach((change: DocumentChange) => {
        const postData = {
          id: change.doc.id,
          ...(change.doc.data() as PostType),
        };
        if (change.type === "added" || change.type === "modified") {
          dispatch(mergeAndSetPosts([postData])); // I think this is the part that is failing and also lets add the update
          updatePostInIndexedDB(postData);
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
      where("timestamp", ">", mountTime),
      orderBy("timestamp", "desc")
    );
    const unsubscribePublic = onSnapshot(publicPostsQuery, processDocChanges);

    // Subscribe to company-specific posts, if the user's company is known
    let unsubscribeCompany = () => {};
    if (userCompany) {
      const companyPostsQuery = query(
        collection(db, "posts"),
        where("user.postUserCompany", "==", userCompany),
        where("timestamp", ">", mountTime),
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

  const numberOfAds = adsOn
    ? Math.ceil(displayPosts.length / AD_INTERVAL) - 1
    : 0;
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
    const postIndex = index - adIndex;

    const modifiedStyle: React.CSSProperties = {
      ...style,
      marginBottom: "10px",
      backgroundColor: "transparent",
      borderRadius: "5px",
    };

    if (isAdPosition) {
      return <AdComponent key={`ad-${adIndex}`} style={style} adsOn={adsOn} />;
    } else if (postIndex < displayPosts.length) {
      const postWithID = displayPosts[postIndex];

      return (
        <PostCardRenderer
          key={postWithID.id}
          currentUserUid={currentUser?.uid}
          // index={postIndex}
          index={index}
          style={modifiedStyle}
          data={{ post: postWithID, getPostsByTag }}
          setSearchResults={setSearchResults}
          setCurrentHashtag={setCurrentHashtag}
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
  if (displayPosts.length === 0) {
    return <NoContentCard />;
  }

  // Render the list with the ad at the top followed by posts
  return (
    <div className="activity-feed-box">
      <div className="top-of-activity-feed">
        <NewSection />
        <HashTagSearchBar
          setSearchResults={setSearchResults}
          currentHashtag={currentHashtag}
          clearSearch={clearSearch}
        />
      </div>

      <List
        ref={listRef}
        className="list-card"
        height={800}
        itemCount={itemCount}
        itemSize={getItemSize}
        width={getListWidth()}
        itemData={{
          posts: posts,
          getPostsByTag: getPostsByTag,
        }}
      >
        {itemRenderer}
      </List>
    </div>
  );
};

export default ActivityFeed;
