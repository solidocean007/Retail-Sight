// ActivityFeed.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import { VirtuosoHandle } from "react-virtuoso";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
import store, { RootState } from "../utils/store";
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
import {
  addPostsToIndexedDB,
  getPostsFromIndexedDB,
  // clearHashtagPostsInIndexedDB,
  // clearPostsInIndexedDB,
  // clearStarTagPostsInIndexedDB,
  // clearUserCreatedPostsInIndexedDB,
} from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts } from "../Slices/postsSlice";
import usePosts from "../hooks/usePosts";
import { CircularProgress } from "@mui/material";
import NoResults from "./NoResults";
import FilterSummaryBanner from "./FilterSummaryBanner";
import { getFilterSummaryText } from "./FilterSideBar/utils/filterUtils";
import { PostQueryFilters } from "../utils/types";
import { useNavigate } from "react-router-dom";

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
  postIdToScroll: string | null;
  setPostIdToScroll: React.Dispatch<React.SetStateAction<string | null>>;
  toggleFilterMenu?: () => void;
  appliedFilters?: PostQueryFilters | null;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  virtuosoRef,
  // currentHashtag,
  setCurrentHashtag,
  // currentStarTag,
  // setCurrentStarTag,
  clearSearch,
  activePostSet,
  setActivePostSet,
  // isSearchActive,
  setIsSearchActive,
  // clearInput,
  postIdToScroll,
  setPostIdToScroll,
  toggleFilterMenu,
  appliedFilters,
}) => {
  const dispatch = useAppDispatch();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const filteredCount = useSelector(
    (s: RootState) => s.posts.filteredPostCount
  );
  const rawPosts = useSelector((state: RootState) => state.posts.posts);
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  );
  const displayPosts = useMemo(() => {
    return activePostSet === "filteredPosts" ? filteredPosts : rawPosts;
  }, [
    activePostSet,
    activePostSet === "filteredPosts" ? filteredPosts : rawPosts,
  ]);
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

  useEffect(() => {
    if (!postIdToScroll || !virtuosoRef.current || !displayPosts.length) return;

    const index = displayPosts.findIndex((p) => p.id === postIdToScroll);
    if (index === -1) return;

    virtuosoRef.current.scrollToIndex({ index, align: "start" });

    setPostIdToScroll(null); // No delay
  }, [postIdToScroll, displayPosts.length]);

  const prevActivePostSet = useRef(activePostSet);
  useEffect(() => {
    if (activePostSet !== prevActivePostSet.current) {
      virtuosoRef.current?.scrollToIndex({ index: 0, align: "start" });
      prevActivePostSet.current = activePostSet;
    }
  }, [activePostSet]);

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

  // only block the whole feed when you have _no_ items yet:
  if (loading && rawPosts.length === 0) {
    return <CircularProgress />;
  }

  if (displayPosts.length === 0) {
    return <NoResults />;
  }

  return (
    <div className="activity-feed-box">
     

      <Virtuoso
        ref={virtuosoRef}
        increaseViewportBy={500}
        style={{ height: 800, width: "100%" }} // is this necessary?
        data={displayPosts}
        defaultItemHeight={itemHeight}
        itemContent={(index, post) => {
          if (!post?.id) return null;

          return (
            <div
              key={post.id}
              className="post-card-renderer-container"
              style={{ minHeight: 300 }}
            >
              <PostCardRenderer
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
        endReached={
          activePostSet === "posts"
            ? () => {
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
                        const { posts, lastVisible: newLastVisible } =
                          action.payload;
                        setLastVisible(newLastVisible);

                        if (posts.length > 0) {
                          addPostsToIndexedDB(posts);
                          // dispatch(appendPosts(posts));
                          dispatch(mergeAndSetPosts(posts));
                          setHasMore(true);
                        } else {
                          setHasMore(false);
                        }
                      }
                    })
                    .finally(() => setLoadingMore(false));
                }
              }
            : undefined
        }
        components={{
          Footer: () =>
            loadingMore ? (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <CircularProgress size={24} />
              </div>
            ) : (
              <div
                style={{ textAlign: "center", padding: "1rem", opacity: 0.6 }}
              >
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
