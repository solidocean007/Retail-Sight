// ActivityFeed.tsx
import React, { useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { VirtuosoHandle } from "react-virtuoso";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
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

const AD_INTERVAL = 4;
const POSTS_BATCH_SIZE = 5;

interface ActivityFeedProps {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
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
  onReadyToScrollToPostId?: (cb: (postId: string) => void) => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  virtuosoRef,
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
  onReadyToScrollToPostId,
}) => {
  const dispatch = useAppDispatch();
  const [adsOn] = useState(false);
  const rawPosts = useSelector((state: RootState) => state.posts.posts);
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  );

  let displayPosts: PostWithID[] =
    activePostSet === "filteredPosts" ? filteredPosts : rawPosts;

  // useScrollToPost(listRef, displayPosts, AD_INTERVAL);
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
    onReadyToScrollToPostId?.(scrollToPostId);
  }, [displayPosts]);

  useEffect(() => {
    if (!virtuosoRef.current) return;

    // Reset the list when posts finish loading or screen size changes
    const resetList = () => {
      virtuosoRef.current?.scrollToIndex({ index: 0, align: "start" });
    };

    resetList();

    // Small delay in case visual viewport changes slightly after load
    const timeout = setTimeout(() => {
      resetList();
    }, 200);

    return () => clearTimeout(timeout);
  }, [windowWidth, listHeight]);

  const scrollToPostId = (postId: string) => {
    const index = displayPosts.findIndex((post) => post.id === postId);
    if (index >= 0) {
      virtuosoRef.current?.scrollToIndex({ index, align: "start" });
    }
  };

  useEffect(() => {
    // Whenever activePostSet changes, scroll to the top of the list
    virtuosoRef.current?.scrollToIndex({ index: 0, align: "start" });
  }, [activePostSet, virtuosoRef]);

  // Effect to set initial and update list height on resize
  // does this also make the list scroll to the top?
  // useEffect(() => {
  //   const handleResize = () => {
  //     setWindowWidth(window.innerWidth);
  //     setListHeight(window.visualViewport?.height ?? window.innerHeight);
  //     listRef.current?.resetAfterIndex(0, true);
  //   };

  //   window.addEventListener("resize", handleResize);
  //   window.visualViewport?.addEventListener("resize", handleResize); // listen to real viewport changes

  //   return () => {
  //     window.removeEventListener("resize", handleResize);
  //     window.visualViewport?.removeEventListener("resize", handleResize);
  //   };
  // }, []);

  // Function to get the dynamic height of each item
  const ITEM_GAP = 8;

  const getActivityItemHeight = (windowWidth: number) => {
    if (windowWidth <= 500) {
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

  const handleItemsRendered = ({
    visibleStopIndex,
  }: {
    visibleStopIndex: number;
  }) => {
    // const lastIndex = itemCount - 1;
    const lastIndex = itemCount; // last index is declared but never read

    // If the last visible index is the last item in the list
    if (
      visibleStopIndex >= displayPosts.length - 1 &&
      !loadingMore &&
      hasMore
    ) {
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
  const fillerCount = 3;
  const itemCount = displayPosts.length + numberOfAds + fillerCount;

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

      <Virtuoso
        ref={virtuosoRef}
        style={{ height: listHeight, width: "100%" }}
        totalCount={displayPosts.length}
        itemContent={(index) => {
          const post = displayPosts[index];
          return (
            <div className="post-card-renderer-container">
              <PostCardRenderer
                key={post.id}
                currentUserUid={currentUser?.uid}
                index={index}
                style={{ height: "100%" }}
                data={{ post, getPostsByTag, getPostsByStarTag }}
                setCurrentHashtag={setCurrentHashtag}
                setActivePostSet={setActivePostSet}
                setIsSearchActive={setIsSearchActive}
              />
            </div>
          );
        }}
        components={{
          Footer: () => (
            <div style={{ textAlign: "center", padding: "1rem", opacity: 0.6 }}>
              🚩 End of results
            </div>
          ),
        }}
      />
    </div>
  );
};

export default ActivityFeed;
