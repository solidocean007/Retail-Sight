// ActivityFeed.tsx
import React, { useEffect, useState } from "react";
import { VariableSizeList as List, VariableSizeList } from "react-window";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
// import NoContentCard from "./NoContentCard";
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
  // clearHashtagPostsInIndexedDB,
  // clearPostsInIndexedDB,
  // clearStarTagPostsInIndexedDB,
  // clearUserCreatedPostsInIndexedDB,
} from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts } from "../Slices/postsSlice";
import useScrollToPost from "../hooks/useScrollToPost";
import TagOnlySearchBar from "./TagOnlySearchBar";
import usePosts from "../hooks/usePosts";
import { CircularProgress } from "@mui/material";
import NoResults from "./NoResults";
// import NoResults from "./NoResults";

const AD_INTERVAL = 4;
const POSTS_BATCH_SIZE = 5;

export type DisplayablePost = PostWithID | { id: string };

interface ActivityFeedProps {
  listRef: React.RefObject<VariableSizeList>;
  // posts: PostWithID[];
  currentHashtag?: string | null;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  currentStarTag: string | null;
  setCurrentStarTag: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch: () => Promise<void>;
  activePostSet?: string;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  isSearchActive?: boolean;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  clearInput: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  listRef,
  // posts,
  currentHashtag,
  setCurrentHashtag,
  currentStarTag,
  setCurrentStarTag,
  clearSearch,
  activePostSet,
  setActivePostSet,
  isSearchActive,
  setIsSearchActive,
  clearInput,
}) => {
  const dispatch = useAppDispatch();
  const [adsOn] = useState(false);
  const rawPosts = useSelector((state: RootState) => state.posts.posts);
  const filteredPosts = useSelector((state: RootState) => state.posts.filteredPosts);
  
  let displayPosts: DisplayablePost[] = activePostSet === "filteredPosts" ? filteredPosts : rawPosts;
  
  // Inject 3 filler posts to prevent auto-scroll issues
  displayPosts = [ // Type '{ id: string; }[]' is not assignable to type 'PostWithID[]'.
    // Type '{ id: string; }' is not assignable to type 'PostWithID'.
      // Type '{ id: string; }' is missing the following properties from type 'PostType': category, channel, account, displayDate, and 8 more.
    ...displayPosts,
    ...Array(3).fill(null).map(() => ({ id: `filler-${Math.random()}` })),
  ];
  
  // const listRef = useRef<List>(null);
  useScrollToPost(listRef, displayPosts, AD_INTERVAL);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const currentUserCompanyId = currentUser?.companyId;
  // hook to load posts
  usePosts(currentUserCompanyId, POSTS_BATCH_SIZE);
  const [lastVisible, setLastVisible] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // State to store the window width
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const loading = useSelector((state: RootState) => state.posts.loading);
  // State to store the list height
  const [listHeight, setListHeight] = useState(() => {
    if (typeof window !== "undefined") {
      return window.visualViewport
        ? window.visualViewport.height * 0.95
        : window.innerHeight * 0.95;
    }
    return 800; // Fallback for SSR or very early load
  });

  useEffect(() => {
    if (!listRef.current) return;

    // Reset the list when posts finish loading or screen size changes
    const resetList = () => {
      listRef.current?.resetAfterIndex(0, true);
    };

    resetList();

    // Small delay in case visual viewport changes slightly after load
    const timeout = setTimeout(() => {
      resetList();
    }, 200);

    return () => clearTimeout(timeout);
  }, [displayPosts.length, windowWidth, listHeight]);

  // Function to calculate list height
  const calculateListHeight = () => {
    if (window.visualViewport) {
      return window.visualViewport.height * 0.95;
    }
    return window.innerHeight * 0.95;
  };

  useEffect(() => {
    // Whenever activePostSet changes, scroll to the top of the list
    listRef.current?.scrollTo(0);
  }, [activePostSet, listRef]);

  // Effect to set initial and update list height on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setListHeight(window.visualViewport?.height ?? window.innerHeight);
      listRef.current?.resetAfterIndex(0, true);
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize); // listen to real viewport changes

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  // Function to get the dynamic height of each item
  const ITEM_GAP = 8;

  const getItemSize = (index: number) => {
    // const baseHeight = getActivityItemHeight(windowWidth);
    // const isAdPosition = adsOn && (index + 1) % AD_INTERVAL === 0;
    // return isAdPosition ? 200 + ITEM_GAP : baseHeight + ITEM_GAP;
    return getActivityItemHeight(windowWidth) + ITEM_GAP;
  };

  const getActivityItemHeight = (windowWidth: number) => {
    if (windowWidth <= 500) {
      // return 720;
      // return 620;
      return 700;
    } else if (windowWidth <= 600) {
      return 750;
    } else if (windowWidth <= 700) {
      return 750;
    } else if (windowWidth <= 800) {
      return 800;
    } else if (windowWidth <= 900) {
      return 850;
    } else {
      return 900;
    }
  };

  // Effect to update the window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setListHeight(calculateListHeight());
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleItemsRendered = ({
    visibleStopIndex,
  }: {
    visibleStopIndex: number;
  }) => {
    // const lastIndex = itemCount - 1;
    const lastIndex = itemCount; // last index is declared but never read

    // If the last visible index is the last item in the list
    if (visibleStopIndex >= displayPosts.length - 1 && !loadingMore && hasMore) {
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

    // REMOVE any marginBottom/height here — it's not respected properly
    const wrapperStyle: React.CSSProperties = {
      ...style,
      paddingBottom: `${ITEM_GAP}px`, // this space is within the fixed height
      boxSizing: "border-box",
    };

    if (isAdPosition) {
      return <div style={wrapperStyle}>{/* Your AdComponent here */}</div>;
    } else if (postIndex < displayPosts.length) {
      const postWithID = displayPosts[postIndex];

      if (!postWithID?.id || postWithID.id.startsWith("filler-")) {
        return <div style={style}></div>; // empty div for filler
      }

      return (
        <div className="post-card-renderer-container" style={wrapperStyle}>
          <PostCardRenderer
            key={postWithID.id}
            currentUserUid={currentUser?.uid}
            index={index}
            style={{ height: "100%" }} // Make post take full height
            data={{ post: postWithID, getPostsByTag, getPostsByStarTag }}
            setCurrentHashtag={setCurrentHashtag}
            setActivePostSet={setActivePostSet}
            setIsSearchActive={setIsSearchActive}
          />
        </div>
      );
    } else {
      return null;
    }
  };

  if (loading || loadingMore) {
    return <CircularProgress />;
  }

  if (displayPosts.length === 0) {
    return <NoResults onClearFilters={clearSearch} />;
  }

  return (
    <div className="activity-feed-box">
      <div className="top-of-activity-feed">
        <TagOnlySearchBar
          currentStarTag={currentStarTag}
          setCurrentStarTag={setCurrentStarTag}
          currentHashtag={currentHashtag}
          setCurrentHashtag={setCurrentHashtag}
          clearSearch={clearSearch}
          setActivePostSet={setActivePostSet}
          isSearchActive={isSearchActive}
          setIsSearchActive={setIsSearchActive}
          clearInput={clearInput}
        />
      </div>

      <List
        ref={listRef}
        className="list-container"
        height={listHeight}
        itemCount={itemCount}
        width={"100%"}
        itemSize={getItemSize}
        onItemsRendered={handleItemsRendered}
        itemData={{
          posts: displayPosts,
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
