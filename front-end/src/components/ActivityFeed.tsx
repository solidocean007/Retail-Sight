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
import { deletePost, mergeAndSetPosts } from "../Slices/postsSlice";
import {
  DocumentChange,
  QuerySnapshot,
  Timestamp,
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
import useScrollToPost from "../hooks/useScrollToPost";
import TagOnlySearchBar from "./TagOnlySearchBar";

const POSTS_BATCH_SIZE = 5;
const AD_INTERVAL = 4;
// const BASE_ITEM_HEIGHT = 900;

interface ActivityFeedProps {
  // searchResults: PostWithID[] | null;
  // setSearchResults: React.Dispatch<React.SetStateAction<PostWithID[] | null>>;
  currentHashtag: string | null;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch: () => Promise<void>;
  activePostSet: string;
  setActivePostSet: React.Dispatch<React.SetStateAction<string>>;
  isSearchActive: boolean;
  setIsSearchActive: React.Dispatch<React.SetStateAction<boolean>>;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  currentHashtag,
  setCurrentHashtag,
  clearSearch,
  activePostSet,
  setActivePostSet,
  isSearchActive,
  setIsSearchActive,
}) => {
  const dispatch = useAppDispatch();
  const [adsOn] = useState(false);

  const posts = useSelector((state: RootState) => state.posts.posts); // this is the current redux store of posts
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  );

  const hashtagPosts = useSelector(
    (state: RootState) => state.posts.hashtagPosts
  );

  // Decide which posts to display
  let displayPosts: PostWithID[];
  switch (activePostSet) {
    case "filtered":
      displayPosts = filteredPosts;
      break;
    case "hashtag":
      displayPosts = hashtagPosts;
      break;
    default:
      displayPosts = posts;
  }

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
      dispatch(
        fetchMorePostsBatch({
          lastVisible,
          limit: POSTS_BATCH_SIZE,
          currentUserCompanyId,
        })
      )
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
          dispatch(mergeAndSetPosts(indexedDBPosts)); // Update Redux store with posts from IndexedDB
        } else {
          const action = await dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompanyId })
          );
          if (fetchInitialPostsBatch.fulfilled.match(action)) {
            const fetchedPosts = action.payload.posts;
            dispatch(mergeAndSetPosts(fetchedPosts));
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
          orderBy("displayDate", "desc"),
          limit(4)
        );
        const querySnapshot = await getDocs(publicPostsQuery);
        const publicPosts = querySnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as PostWithID))
          .filter((post) => post.visibility === "public");
        dispatch(mergeAndSetPosts(publicPosts));
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


  useEffect(() => {
    // Assume that the server generates timestamps in UTC in ISO 8601 format
    // const mountTime = new Date().toISOString();


    // Function to process document changes
    const processDocChanges = (snapshot: QuerySnapshot) => {
      const changes = snapshot.docChanges();
      changes.forEach((change: DocumentChange) => {
        const postData = {
          id: change.doc.id,
          ...(change.doc.data() as PostType),
        };
        if (change.type === "added" || change.type === "modified") {
          dispatch(mergeAndSetPosts([postData]));
          updatePostInIndexedDB(postData);
        } else if (change.type === "removed") {
          dispatch(deletePost(change.doc.id));
          removePostFromIndexedDB(change.doc.id);
          deleteUserCreatedPostInIndexedDB(change.doc.id);
        }
      });
    };

    // Subscribe to public posts
    const publicPostsQuery = query(
      collection(db, "posts"),
      where("visibility", "==", "public"),
      orderBy("timestamp", "desc"),
      // where("timestamp", ">", mountTime)
    );
    const unsubscribePublic = onSnapshot(publicPostsQuery, processDocChanges);

    let unsubscribeCompany = () => {};

    // If the user's company ID is available, set up an additional listener
    if (currentUser?.companyId) {
      console.log(currentUser.companyId, ' : current user id') // this line does log eventually
      const companyPostsQuery = query(
        collection(db, "posts"),
        where("postUserCompanyId", "==", currentUser.companyId),
        orderBy("timestamp", "desc"),
        // where("timestamp", ">", mountTime)
      );
      unsubscribeCompany = onSnapshot(companyPostsQuery, processDocChanges);
    } else {
      console.log(
        "No companyId available, skipping setup for company posts listener"
      ); // even though i'm logged in, this line logs.  this could be a clue to the problem.
    }

    // Cleanup function to unsubscribe from both listeners
    return () => {
      unsubscribePublic();
      unsubscribeCompany();
    };
  }, [currentUser?.companyId]);

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
          index={index}
          style={modifiedStyle}
          data={{ post: postWithID, getPostsByTag, getPostsByStarTag }}
          setCurrentHashtag={setCurrentHashtag}
          setActivePostSet={setActivePostSet}
          setIsSearchActive={setIsSearchActive}
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
  // if (displayPosts.length === 0) {
  //   return <NoContentCard />;
  // }

  return (
    <div className="activity-feed-box">
      <div className="top-of-activity-feed">
        <TagOnlySearchBar
          currentHashtag={currentHashtag}
          setCurrentHashtag={setCurrentHashtag}
          clearSearch={clearSearch}
          setActivePostSet={setActivePostSet}
          isSearchActive={isSearchActive}
          setIsSearchActive={setIsSearchActive}
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
