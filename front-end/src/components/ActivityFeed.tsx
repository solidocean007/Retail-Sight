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
  // clearSearch: () => Promise<void>;
  activePostSet?: string;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  isSearchActive?: boolean;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  clearInput: boolean;
  postIdToScroll: string | null;
  setPostIdToScroll: React.Dispatch<React.SetStateAction<string | null>>;
  toggleFilterMenu?: () => void;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  virtuosoRef,
  // currentHashtag,
  setCurrentHashtag,
  // currentStarTag,
  // setCurrentStarTag,
  // clearSearch,
  activePostSet,
  setActivePostSet,
  // isSearchActive,
  setIsSearchActive,
  // clearInput,
  postIdToScroll,
  setPostIdToScroll,
  // toggleFilterMenu,
}) => {
  const dispatch = useAppDispatch();
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const scrollToTop = () => {
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  };

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
    if (!postIdToScroll || !virtuosoRef.current || !displayPosts.length) return;

    const index = displayPosts.findIndex((p) => p.id === postIdToScroll);
    if (index === -1) return;

    console.log("Scrolling to:", postIdToScroll, "at index:", index);
    virtuosoRef.current.scrollToIndex({ index, align: "start" });

    setPostIdToScroll(null); // No delay
  }, [postIdToScroll, displayPosts.length]);

  useEffect(() => {
    // Only scroll to top when activePostSet changes and no postId is targeted
    if (!postIdToScroll) {
      virtuosoRef.current?.scrollToIndex({ index: 0, align: "start" });
    }
  }, [activePostSet]); // ✅ remove postIdToScroll from deps

  const numberOfAds = adsOn ? Math.floor(displayPosts.length / AD_INTERVAL) : 0;
  const fillerCount = 3;
  const itemCount = displayPosts.length + numberOfAds + fillerCount;

  if (loading || loadingMore) {
    return <CircularProgress />;
  }

  if (displayPosts.length === 0) {
    return <NoResults />;
  }

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

  const itemHeight = getActivityItemHeight(windowWidth);

  return (
    <div className="activity-feed-box">
      <div className="top-of-activity-feed">
        {/* <button onClick={toggleFilterMenu} className="filter-menu-toggle">
          Filters
        </button> */}
      </div>

      <Virtuoso
        ref={virtuosoRef}
        increaseViewportBy={500}
        style={{ height: listHeight, width: "100%" }}
        totalCount={itemCount}
        defaultItemHeight={itemHeight}
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
                postIdToScroll={postIdToScroll}
              />
            </div>
          );
        }}
        endReached={() => {
          if (!loadingMore && hasMore) {
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
                    addPostsToIndexedDB(posts);
                    dispatch(mergeAndSetPosts(posts));
                    setHasMore(true);
                  } else {
                    setHasMore(false);
                  }
                }
              })
              .finally(() => setLoadingMore(false));
          }
        }}
        components={{
          Footer: () => (
            <div style={{ textAlign: "center", padding: "1rem", opacity: 0.6 }}>
              🚩 End of results
            </div>
          ),
        }}
        scrollerRef={(ref) => {
          if (ref) {
            ref.addEventListener("scroll", (e) => {
              const scrollTop = (e.target as HTMLElement).scrollTop;
              setShowScrollTop(scrollTop > 4000);
            });
          }
        }}
      />
      {showScrollTop && (
        <button
          className="scroll-to-top-btn"
          aria-label="Scroll to top"
          onClick={scrollToTop}
        >
          <span className="arrow-icon">↑</span>
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
