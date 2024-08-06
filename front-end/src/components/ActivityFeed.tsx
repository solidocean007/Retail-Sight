// ActivityFeed.tsx
import React, { useEffect, useState } from "react";
import { VariableSizeList as List, VariableSizeList } from "react-window";
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
  // fetchInitialPostsBatch,
  fetchMorePostsBatch,
} from "../thunks/postsThunks";
import "./activityFeed.css";
import { PostWithID } from "../utils/types";
import {
  addPostsToIndexedDB,
  clearHashtagPostsInIndexedDB,
  clearPostsInIndexedDB,
  clearStarTagPostsInIndexedDB,
  clearUserCreatedPostsInIndexedDB,
} from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts } from "../Slices/postsSlice";
import useScrollToPost from "../hooks/useScrollToPost";
import TagOnlySearchBar from "./TagOnlySearchBar";
import usePosts from "../hooks/usePosts";

const AD_INTERVAL = 4;
const POSTS_BATCH_SIZE = 5;

interface ActivityFeedProps {
  listRef: React.RefObject<VariableSizeList>;
  posts: PostWithID[];
  currentHashtag?: string | null;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch?: () => Promise<void>;
  activePostSet?: string;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  isSearchActive?: boolean;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  listRef,
  posts,
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

  // const listRef = useRef<List>(null);
  useScrollToPost(listRef, posts, AD_INTERVAL);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const currentUserCompanyId = currentUser?.companyId;
  // hook to load posts
  usePosts(currentUserCompanyId, POSTS_BATCH_SIZE);
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
    return window.innerHeight * 0.95;
  };

  const clearIndexedDB = async () => {
    await clearPostsInIndexedDB();
    await clearHashtagPostsInIndexedDB();
    await clearUserCreatedPostsInIndexedDB();
    await clearStarTagPostsInIndexedDB();
  };

  useEffect(() => {
    // Whenever activePostSet changes, scroll to the top of the list
    listRef.current?.scrollTo(0);
  }, [activePostSet, listRef]);

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
      // return 620;
      return 725;
    } else if (windowWidth <= 700) {
      return 800;
    } else if (windowWidth <= 800) {
      return 850;
    } else if (windowWidth <= 900) {
      return 925;
    } else {
      return 900;
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
  // const getListWidth = () => {
  //   if (windowWidth <= 480) {
  //     return windowWidth - 25; // Subtract some pixels for padding/margin
  //   } else if (windowWidth <= 1150) {
  //     return Math.min(550, windowWidth - 25);
  //   }
  //   return 650;
  // };
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

  const numberOfAds = adsOn ? Math.floor(posts.length / AD_INTERVAL) : 0;
  const itemCount = posts.length + numberOfAds;

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
    } else if (postIndex < posts.length) {
      const postWithID = posts[postIndex];

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
        // width={getListWidth()}
        width='100%'
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
