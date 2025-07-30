// ActivityFeed.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  fetchFilteredPostsBatch,
  // fetchInitialPostsBatch,
  fetchMorePostsBatch,
} from "../thunks/postsThunks";
import "./activityFeed.css";
import {
  addPostsToIndexedDB,
  getFilteredSet,
  getPostsFromIndexedDB,
  shouldRefetch,
  storeFilteredSet,
  // clearHashtagPostsInIndexedDB,
  // clearPostsInIndexedDB,
  // clearStarTagPostsInIndexedDB,
  // clearUserCreatedPostsInIndexedDB,
} from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts, setFilteredPosts } from "../Slices/postsSlice";
import usePosts from "../hooks/usePosts";
import { CircularProgress } from "@mui/material";
import NoResults from "./NoResults";
// import FilterSummaryBanner from "./FilterSummaryBanner";
// import {
//   getFilterHash,
//   getFilterSummaryText,
// } from "./FilterSideBar/utils/filterUtils";
import { PostQueryFilters } from "../utils/types";
import { useNavigate } from "react-router-dom";
import { normalizePost } from "../utils/normalizePost";
import BeerCaseStackAnimation from "./CaseStackAnimation/BeerCaseStackAnimation";
import { getFilterHash } from "./FilterSideBar/utils/filterUtils";

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
  const [showLoader, setShowLoader] = useState(false);

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

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
  const [lastVisible, setLastVisible] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  usePosts(currentUserCompanyId, POSTS_BATCH_SIZE);

  const scrollToTop = () => {
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  };

  // const { testPosts, loading, error } = usePostsTest(currentUser?.companyId);

  // useEffect(() => {
  //   if (!loading && !error) {
  //     console.log(
  //       "[Test] Posts:",
  //       testPosts.map((p) => p.displayDate)
  //     );
  //   }
  // }, [testPosts, loading, error]);

  // this should only be responsible for scrolling to the top on a activePostsSet change
  const prevActivePostSet = useRef(activePostSet);
  useEffect(() => {
    if (activePostSet !== prevActivePostSet.current) {
      virtuosoRef.current?.scrollToIndex({ index: 0, align: "start" });
      prevActivePostSet.current = activePostSet;
    }
  }, [activePostSet]);

  useEffect(() => {
    setShowLoader(true);
    const timeout = setTimeout(() => {
      setShowLoader(false);
    }, 1000); // 1 sec for animation effect

    return () => clearTimeout(timeout);
  }, []);

  // const getActivityItemHeight = (windowWidth: number) => {
  //   if (windowWidth <= 500) {
  //     return 700;
  //   } else if (windowWidth <= 600) {
  //     return 750;
  //   } else if (windowWidth <= 700) {
  //     return 750;
  //   } else if (windowWidth <= 800) {
  //     return 800;
  //   } else if (windowWidth <= 900) {
  //     return 850;
  //   } else {
  //     return 900;
  //   }
  // };

  // const itemHeight = getActivityItemHeight(windowWidth);

  // if (showLoader) {
  //   return (
  //     <div
  //       style={{
  //         height: "100vh",
  //         display: "flex",
  //         justifyContent: "center",
  //         alignItems: "center",
  //       }}
  //     >
  //       <BeerCaseStackAnimation minDuration={1000} />
  //     </div>
  //   );
  // }

  if (hasLoadedOnce && displayPosts.length === 0) {
    return <NoResults />;
  }

  const hasAutoScrolled = useRef(false);

  const handlePostVisible = (id: string, idx: number) => {
    if (hasAutoScrolled.current || id !== postIdToScroll) return;
    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({ index: idx, align: "start" });
      setPostIdToScroll(null);
      hasAutoScrolled.current = true;
    }
  };

  useEffect(() => {
    if (!postIdToScroll || !virtuosoRef.current) return;

    const idx = displayPosts.findIndex((p) => p.id === postIdToScroll);
    if (idx === -1) return;

    const timeout = setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index: idx, align: "start" });
    }, 1000); // 🔧 tweak this value (500–1000ms) based on real-world test

    if (idx === -1 && appliedFilters) {
      console.warn("Post not found. Refetching...");
      dispatch(fetchFilteredPostsBatch({ filters: appliedFilters })).then(
        (action) => {
          if (fetchFilteredPostsBatch.fulfilled.match(action)) {
            const newPosts = action.payload.posts;
            const newIdx = newPosts.findIndex((p) => p.id === postIdToScroll);
            if (newIdx !== -1 && virtuosoRef.current) {
              virtuosoRef.current.scrollToIndex({
                index: newIdx,
                align: "start",
              });
            }
          }
        }
      );
    }

    return () => clearTimeout(timeout);
  }, [postIdToScroll, displayPosts]);

  return (
    <div className="activity-feed-box">
      {showLoader ? (
        <div
          style={{
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <BeerCaseStackAnimation minDuration={1000} />
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          increaseViewportBy={500}
          style={{ height: 800, width: "100%" }} // is this necessary?
          data={displayPosts}
          // defaultItemHeight={itemHeight}
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
                  onPostVisible={handlePostVisible}
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
                        currentUser,
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
                            dispatch(
                              mergeAndSetPosts(posts.map(normalizePost))
                            );
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
      )}
      {showScrollTop && !showLoader && (
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
