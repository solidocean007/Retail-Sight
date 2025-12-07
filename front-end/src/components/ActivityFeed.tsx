// ActivityFeed.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
  fetchFilteredPostsBatch,
  // fetchInitialPostsBatch,
  fetchMorePostsBatch,
} from "../thunks/postsThunks";
import "./activityFeed.css";
import { addPostsToIndexedDB } from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts } from "../Slices/postsSlice";
import usePosts from "../hooks/usePosts";
import NoResults from "./NoResults";
// import FilterSummaryBanner from "./FilterSummaryBanner";
// import {
//   getFilterHash,
//   getFilterSummaryText,
// } from "./FilterSideBar/utils/filterUtils";
import { PostQueryFilters } from "../utils/types";
import { normalizePost } from "../utils/normalize";
import BeerCaseStackAnimation from "./CaseStackAnimation/BeerCaseStackAnimation";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const POSTS_BATCH_SIZE = 5;

interface ActivityFeedProps {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  currentHashtag?: string | null;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  currentStarTag?: string | null;
  setCurrentStarTag?: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch: () => Promise<void>;
  activeCompanyPostSet: "posts" | "filteredPosts";
  setActiveCompanyPostSet: React.Dispatch<
    React.SetStateAction<"posts" | "filteredPosts">
  >;
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
  setCurrentHashtag,
  activeCompanyPostSet,
  setActiveCompanyPostSet,
  setIsSearchActive,
  postIdToScroll,
  setPostIdToScroll,
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
  // console.log('rawPosts: ', rawPosts)
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  );
  const displayPosts = useMemo(() => {
    return activeCompanyPostSet === "filteredPosts" ? filteredPosts : rawPosts;
  }, [
    activeCompanyPostSet,
    activeCompanyPostSet === "filteredPosts" ? filteredPosts : rawPosts,
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

  // this should only be responsible for scrolling to the top on a activePostsSet change
  const prevActivePostSet = useRef(activeCompanyPostSet);
  useEffect(() => {
    if (activeCompanyPostSet !== prevActivePostSet.current) {
      virtuosoRef.current?.scrollToIndex({ index: 0, align: "start" });
      prevActivePostSet.current = activeCompanyPostSet;
    }
  }, [activeCompanyPostSet]);

  useEffect(() => {
    setShowLoader(true);
    const timeout = setTimeout(() => {
      setShowLoader(false);
    }, 1000); // 1 sec for animation effect

    return () => clearTimeout(timeout);
  }, []);

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
          <BeerCaseStackAnimation
            minDuration={4000}
            maxStagger={2200}
            dropMs={900}
            loop
          />
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          increaseViewportBy={{ top: 600, bottom: 800 }}

          style={{
            // height: 1000,
            height: "calc(100vh - 180px)", // ✅ dynamic, responsive
            width: "100%",
          }} // is this necessary?
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
                  setActivePostSet={setActiveCompanyPostSet}
                  setIsSearchActive={setIsSearchActive}
                  postIdToScroll={postIdToScroll}
                  onPostVisible={handlePostVisible}
                />
              </div>
            );
          }}
          endReached={
            activeCompanyPostSet === "posts"
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
            Footer: () => {
              // 🔹 Show animation during fetches
              if (loadingMore) {
                return (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: "2rem 0",
                    }}
                  >
                    <BeerCaseStackAnimation
                      minDuration={2500}
                      maxStagger={1800}
                      dropMs={800}
                      loop={false}
                    />
                  </div>
                );
              }

              // 🔹 Only show footer text if filters are active
              if (activeCompanyPostSet === "filteredPosts" && !hasMore) {
                return (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1rem",
                      opacity: 0.6,
                    }}
                  >
                    🚩 End of filtered results
                  </div>
                );
              }

              // 🔹 Otherwise, render nothing
              return null;
            },
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
          <KeyboardArrowUpIcon />
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
