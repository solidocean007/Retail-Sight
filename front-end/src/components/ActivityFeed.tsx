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
import { CircularProgress } from "@mui/material";
import NoResults from "./NoResults";
// import FilterSummaryBanner from "./FilterSummaryBanner";
// import {
//   getFilterHash,
//   getFilterSummaryText,
// } from "./FilterSideBar/utils/filterUtils";
import { PostQueryFilters } from "../utils/types";
import { normalizePost } from "../utils/normalizePost";
import BeerCaseStackAnimation from "./CaseStackAnimation/BeerCaseStackAnimation";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

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
  // clearSearch,
  activePostSet,
  setActivePostSet,
  // isSearchActive,
  setIsSearchActive,
  // clearInput,
  postIdToScroll,
  setPostIdToScroll,
  // toggleFilterMenu,
  appliedFilters,
}) => {
  const dispatch = useAppDispatch();
  const [showLoader, setShowLoader] = useState(false);
  const [lastVisibleSnap, setLastVisibleSnap] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // initial load cursor from usePosts

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
  // hook to load posts
  // const [lastVisible, setLastVisible] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  // lastVisible is no longer managed here, comes directly from usePosts

  const { lastVisibleSnap: initialCursor } = usePosts({
    mode: { type: "distributor", distributorId: currentUser?.companyId ?? "" },
    batchSize: POSTS_BATCH_SIZE,
  });

  useEffect(() => {
    if (displayPosts.length > 0) setHasLoadedOnce(true);
  }, [displayPosts]);

  useEffect(() => {
    if (initialCursor) {
      setLastVisibleSnap(initialCursor);
    }
  }, [initialCursor]);

  const scrollToTop = () => {
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  };

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
          increaseViewportBy={500}
          style={{ height: 1000, width: "100%" }} // is this necessary?
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
                  if (!loadingMore && hasMore && lastVisibleSnap) {
                    console.log(
                      "🔔 endReached fired, cursor:",
                      lastVisibleSnap.id
                    );

                    setLoadingMore(true);
                    dispatch(
                      fetchMorePostsBatch({
                        lastVisibleSnap, // 👈 pass the snapshot, not the string
                        limit: POSTS_BATCH_SIZE,
                        currentUser,
                      })
                    )
                      .then((action) => {
                        if (fetchMorePostsBatch.fulfilled.match(action)) {
                          const { posts, lastVisibleId: newCursorId } =
                            action.payload;
                          console.log(
                            "Fetched more posts:",
                            posts.length,
                            newCursorId
                          );

                          if (posts.length > 0) {
                            addPostsToIndexedDB(posts);
                            dispatch(
                              mergeAndSetPosts(posts.map(normalizePost))
                            );
                            setHasMore(true);

                            // update local cursor for next page
                            if (action.meta.arg.lastVisibleSnap) {
                              setLastVisibleSnap(
                                action.meta.arg.lastVisibleSnap
                              );
                            }
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
          <KeyboardArrowUpIcon />
        </button>
      )}
    </div>
  );
};

export default ActivityFeed;
