import React, { useEffect, useRef, useState } from "react";
import { VariableSizeList as List } from "react-window";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
import NoContentCard from "./NoContentCard";
// import AdComponent from "./AdSense/AdComponent";
import { RootState } from "../utils/store";
import { useAppDispatch } from "../utils/store";
import {
  getPostsByStarTag,
  getPostsByTag,
} from "../utils/PostLogic/getPostsByTag";
import {
  fetchInitialPostsBatch,
  fetchMorePostsBatch,
} from "../thunks/postsThunks";
import "./activityFeed.css";
import { PostType, PostWithID } from "../utils/types";
import {
  addPostsToIndexedDB,
  clearHashtagPostsInIndexedDB,
  clearPostsInIndexedDB,
  clearStarTagPostsInIndexedDB,
  clearUserCreatedPostsInIndexedDB,
  deleteUserCreatedPostInIndexedDB,
  // clearHashtagPostsInIndexedDB,
  // clearPostsInIndexedDB,
  // clearUserCreatedPostsInIndexedDB,
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

const POSTS_BATCH_SIZE = 5; // ill reduce this later after i implement the batchMorePosts logic
const AD_INTERVAL = 4;
// const BASE_ITEM_HEIGHT = 900;

const ActivityFeed = () => {
  const dispatch = useAppDispatch();
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

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const currentUserCompanyId = currentUser?.companyId;

  const [lastVisible, setLastVisible] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // State to store the window width
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // const loading = useSelector((state: RootState) => state.posts.loading);
  // State to store the list height
  const [listHeight, setListHeight] = useState(0);

  // Function to calculate list height
  const calculateListHeight = () => {
    return window.innerHeight * 0.9;
  };

  const clearIndexedDB = async () => {
    await clearPostsInIndexedDB();
    await clearHashtagPostsInIndexedDB();
    await clearUserCreatedPostsInIndexedDB();
    await clearStarTagPostsInIndexedDB();
  };

  // Effect to set initial and update list height on resize
  useEffect(() => {
    const handleResize = () => {
      setListHeight(calculateListHeight());
    };

    // Set initial height
    handleResize();

    // Add event listener for window resize
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    const isAdPosition = adsOn && (index + 1) % AD_INTERVAL === 0;

    if (isAdPosition) {
      return adsOn ? 200 + gapSize : 0;
    }
    return getActivityItemHeight(windowWidth) + gapSize;
  };

  const getActivityItemHeight = (windowWidth: number) => {
    if (windowWidth <= 500) {
      // return 720;
      return 620;
    } else if (windowWidth <= 700) {
      return 680;
    } else if (windowWidth <= 800) {
      return 720;
    } else if (windowWidth <= 900) {
      return 780;
    } else {
      return 820;
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
    } else if (windowWidth <= 1150) {
      return Math.min(550, windowWidth - 25);
    }
    return 650;
  };

  const handleItemsRendered = ({
    visibleStopIndex,
  }: {
    visibleStopIndex: number;
  }) => {
    const lastIndex = itemCount - 1;

    // If the last visible index is the last item in the list
    if (visibleStopIndex === lastIndex && !loadingMore && hasMore) {
      setLoadingMore(true);
      dispatch(fetchMorePostsBatch({ lastVisible, limit: POSTS_BATCH_SIZE, currentUserCompanyId }))
        .then((action) => {
          if (fetchMorePostsBatch.fulfilled.match(action)) {
            const { posts, lastVisible: newLastVisible } = action.payload;
            setLastVisible(newLastVisible);
            if (posts.length > 0) {
              addPostsToIndexedDB(posts); // Ensure new posts are added to IndexedDB
              setHasMore(true);
            } else {
              setHasMore(false);
            }
            // Merge new posts with existing posts in Redux store
            dispatch(mergeAndSetPosts(posts));
          } else if (fetchMorePostsBatch.rejected.match(action)) {
            // Handle error
          }
        })
        .finally(() => {
          setLoadingMore(false);
        });
    }
  };

  // load indexDB posts or fetch from firestore
  useEffect(() => {
    const fetchPostsForLoggedInUser = async (currentUserCompanyId: string) => {
      try {
        const indexedDBPosts = await getPostsFromIndexedDB();
        if (indexedDBPosts.length > 0) {
          dispatch(setPosts(indexedDBPosts)); // Update Redux store with posts from IndexedDB
        } else {
          const action = await dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompanyId })
          );
          if (fetchInitialPostsBatch.fulfilled.match(action)) {
            const fetchedPosts = action.payload.posts;
            addPostsToIndexedDB(fetchedPosts); // Add fetched posts to IndexedDB
          }
        }
      } catch (error) {
        console.error("Error fetching posts from IndexedDB:", error);
      }
    };

    const fetchPublicPosts = async () => {
      try {
        const publicPostsQuery = query(
          collection(db, "posts"),
          where("visibility", "==", "public"),
          orderBy("timestamp", "desc"),
          limit(4)
        );
        const querySnapshot = await getDocs(publicPostsQuery);
        const publicPosts: PostWithID[] = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as PostWithID))
          .filter((post) => post.visibility === "public");
        dispatch(setPosts(publicPosts)); // Update Redux store with fetched public posts
      } catch (error) {
        console.error("Error fetching public posts:", error);
      }
    };

    if (currentUser === null) {
      fetchPublicPosts();
    } else if (currentUserCompanyId) {
      fetchPostsForLoggedInUser(currentUserCompanyId);
    }
  }, [currentUser, dispatch, currentUserCompanyId]);

  // listen for new or updated posts
  useEffect(() => {
    // Capture the mount time in ISO format
    const mountTime = new Date().toISOString();
    const userCompanyID = currentUser?.companyId;

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
          deleteUserCreatedPostInIndexedDB(change.doc.id);
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
    if (userCompanyID) {
      const companyPostsQuery = query(
        collection(db, "posts"),
        where("user.postUserCompanyID", "==", userCompanyID),
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
  }, [currentUser?.companyId, dispatch]);

  const numberOfAds = adsOn ? Math.floor(displayPosts.length / AD_INTERVAL) : 0;
  const itemCount = displayPosts.length + numberOfAds;

  const itemRenderer = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    let postIndex = index;
    if (adsOn) {
      const adSlotsBefore = Math.floor(index / AD_INTERVAL);
      postIndex -= adSlotsBefore;
    }

    const isAdPosition = adsOn && index % AD_INTERVAL === 0;

    const modifiedStyle: React.CSSProperties = {
      ...style,
      marginBottom: "10px",
      backgroundColor: "transparent",
      borderRadius: "5px",
    };

    if (isAdPosition) {
      // return <AdComponent key={`ad-${index}`} style={style} adsOn={adsOn} />; // Property 'style' does not exist on type 'IntrinsicAttributes & AdComponentProps'
    } else if (postIndex < displayPosts.length) {
      const postWithID = displayPosts[postIndex];

      return (
        <PostCardRenderer
          key={postWithID.id}
          currentUserUid={currentUser?.uid}
          // index={postIndex}
          index={index}
          style={modifiedStyle}
          data={{ post: postWithID, getPostsByTag, getPostsByStarTag }}
          setSearchResults={setSearchResults}
          setCurrentHashtag={setCurrentHashtag}
        />
      );
    } else {
      return null; // For out of bounds index
    }
  };

  // If loading, show a loading indicator
  {
    loadingMore && <div>Loading more posts...</div>;
  }

  // If there are no posts, show the no content card
  if (displayPosts.length === 0) {
    return <NoContentCard />;
  }

  return (
    <div className="activity-feed-box">
      <div className="top-of-activity-feed">
        <HashTagSearchBar
          setSearchResults={setSearchResults}
          currentHashtag={currentHashtag}
          setCurrentHashtag={setCurrentHashtag}
          clearSearch={clearSearch}
        />
      </div>

      <List
        ref={listRef}
        className="list-card"
        height={listHeight}
        itemCount={itemCount}
        itemSize={getItemSize}
        width={getListWidth()}
        onItemsRendered={handleItemsRendered}
        itemData={{
          posts: posts,
          getPostsByTag: getPostsByTag,
          getPostsByStarTag: getPostsByStarTag,
        }}
      >
        {itemRenderer}
      </List>
    </div>
  );
};

export default ActivityFeed;
