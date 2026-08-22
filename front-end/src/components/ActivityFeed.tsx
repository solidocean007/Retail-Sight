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
import { RootState } from "../utils/store";
import { useAppDispatch } from "../utils/store";
import {
  getPostsByStarTag,
  getPostsByTag,
} from "../utils/PostLogic/getPostsByTag";
import {
  fetchFilteredPostsBatch,
  fetchMorePostsBatch,
} from "../thunks/postsThunks";
import "./activityFeed.css";
import { addPostsToIndexedDB } from "../utils/database/indexedDBUtils";
import {
  mergeAndSetPosts,
  selectPostsInitialLoaded,
} from "../Slices/postsSlice";
import usePosts from "../hooks/usePosts";
import NoResults from "./NoResults";
import { PostQueryFilters, PostWithID } from "../utils/types";
import { normalizePost } from "../utils/normalize";
import BeerCaseStackAnimation from "./CaseStackAnimation/BeerCaseStackAnimation";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import FeedSkeleton from "./FeedSkeleton";
import { setFeedReady } from "../Slices/appSlice";
// import { getMemoizedImageSet } from "../utils/PostLogic/getMemoizedImageSet";
import { derivePostImageVariants } from "../utils/PostLogic/derivePostImageVariants";
import { selectUser } from "../Slices/userSlice";

const POSTS_BATCH_SIZE = 5;

export type FeedImageSet = {
  feedSrc: string | null;
  modalChain: string[];
};

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
  unbrandedReviewTrigger?: number;
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
  unbrandedReviewTrigger = 0,
}) => {
  const dispatch = useAppDispatch();
  const initialLoaded = useSelector(selectPostsInitialLoaded);
  const [showLoader, setShowLoader] = useState(false);
  const rawPosts = useSelector((state: RootState) => state.posts.posts);
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts,
  );
  const displayPosts = useMemo(() => {
    return activeCompanyPostSet === "filteredPosts" ? filteredPosts : rawPosts;
  }, [activeCompanyPostSet, filteredPosts, rawPosts]);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const companyId = useSelector(selectUser)?.companyId ?? null;
  const currentUserCompanyId = currentUser?.companyId;
  const [lastVisible, setLastVisible] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unbrandedCursorId, setUnbrandedCursorId] = useState<string | null>(
    null,
  );
  const [pendingUnbrandedId, setPendingUnbrandedId] = useState<string | null>(
    null,
  );
  const [findingUnbranded, setFindingUnbranded] = useState(false);
  const [, setUnbrandedStatus] = useState<string | null>(null);

  const hasNoBrands = useCallback(
    (post: PostWithID) =>
      !post.brands?.some((brand) => String(brand).trim().length > 0),
    [],
  );

  usePosts(currentUserCompanyId, POSTS_BATCH_SIZE);

  const scrollToTop = () => {
    virtuosoRef.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  };

  const scrollToUnbrandedPost = useCallback(
    (postId: string) => {
      const index = displayPosts.findIndex((post) => post.id === postId);
      if (index === -1) return false;

      virtuosoRef.current?.scrollToIndex({
        index,
        align: "start",
        behavior: "smooth",
      });
      setUnbrandedCursorId(postId);
      setUnbrandedStatus(null);
      return true;
    },
    [displayPosts, virtuosoRef],
  );

  useEffect(() => {
    if (!pendingUnbrandedId) return;
    if (scrollToUnbrandedPost(pendingUnbrandedId)) {
      setPendingUnbrandedId(null);
    }
  }, [pendingUnbrandedId, scrollToUnbrandedPost]);

  const findNextUnbrandedPost = useCallback(async () => {
    if (findingUnbranded) return;

    const cursorIndex = unbrandedCursorId
      ? displayPosts.findIndex((post) => post.id === unbrandedCursorId)
      : -1;
    const nextPost = displayPosts
      .slice(cursorIndex + 1)
      .find(hasNoBrands);

    if (nextPost) {
      scrollToUnbrandedPost(nextPost.id);
      return;
    }

    if (activeCompanyPostSet !== "posts") {
      setUnbrandedStatus("No more unbranded posts in these results.");
      return;
    }

    if (!hasMore) {
      setUnbrandedStatus("No more unbranded posts found.");
      return;
    }

    setFindingUnbranded(true);
    setUnbrandedStatus("Checking older posts…");

    try {
      const paginationCursor = rawPosts[rawPosts.length - 1]?.id ?? lastVisible;
      const action = await dispatch(
        fetchMorePostsBatch({
          lastVisible: paginationCursor,
          limit: 25,
          currentUser,
        }),
      );

      if (!fetchMorePostsBatch.fulfilled.match(action)) {
        setUnbrandedStatus("Could not load older posts.");
        return;
      }

      const { posts, lastVisible: newLastVisible } = action.payload;
      setLastVisible(newLastVisible);

      if (posts.length === 0) {
        setHasMore(false);
        setUnbrandedStatus("No more unbranded posts found.");
        return;
      }

      await addPostsToIndexedDB(posts);
      dispatch(mergeAndSetPosts(posts.map(normalizePost)));
      const fetchedMatch = posts.find(hasNoBrands);

      if (fetchedMatch) {
        setPendingUnbrandedId(fetchedMatch.id);
      } else {
        setUnbrandedStatus("No match in this batch. Tap again to continue.");
      }
    } finally {
      setFindingUnbranded(false);
    }
  }, [
    findingUnbranded,
    unbrandedCursorId,
    displayPosts,
    hasNoBrands,
    scrollToUnbrandedPost,
    activeCompanyPostSet,
    hasMore,
    rawPosts,
    lastVisible,
    dispatch,
    currentUser,
  ]);

  const handledUnbrandedTrigger = useRef(0);
  useEffect(() => {
    if (
      unbrandedReviewTrigger <= 0 ||
      unbrandedReviewTrigger === handledUnbrandedTrigger.current
    ) {
      return;
    }

    handledUnbrandedTrigger.current = unbrandedReviewTrigger;
    void findNextUnbrandedPost();
  }, [unbrandedReviewTrigger, findNextUnbrandedPost]);

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

  const hasAutoScrolled = useRef(false);

  const handlePostVisible = useCallback(
    (id: string) => {
      if (hasAutoScrolled.current || id !== postIdToScroll) return;

      const idx = displayPosts.findIndex((p) => p.id === id);
      if (idx === -1) return;

      virtuosoRef.current?.scrollToIndex({ index: idx, align: "start" });
      setPostIdToScroll(null);
      hasAutoScrolled.current = true;
    },
    [postIdToScroll, displayPosts],
  );

  useEffect(() => {
    if (!postIdToScroll || !virtuosoRef.current) return;

    const idx = displayPosts.findIndex((p) => p.id === postIdToScroll);
    if (idx === -1) return;

    const timeout = setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index: idx, align: "start" });
    }, 1000); // 🔧 tweak this value (500–1000ms) based on real-world test

    if (idx === -1 && appliedFilters) {
      console.warn("Post not found. Refetching...");
      dispatch(
        fetchFilteredPostsBatch({ filters: appliedFilters, companyId }),
      ).then((action) => {
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
      });
    }

    return () => clearTimeout(timeout);
  }, [postIdToScroll, displayPosts]);

  useEffect(() => {
    if (initialLoaded && displayPosts.length === 0) {
      dispatch(setFeedReady(true));
    }
  }, [initialLoaded, displayPosts.length, dispatch]);

  if (!initialLoaded && displayPosts.length === 0) {
    return <FeedSkeleton count={6} />;
  }

  if (initialLoaded && displayPosts.length === 0) {
    return <NoResults />;
  }

  return (
    <div className="activity-feed-box">
      {showLoader ? (
        <div
          style={{
            height: "100%",
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
          increaseViewportBy={{ top: 1600, bottom: 2600 }}
          style={{
            height: "100%",
            width: "100%", // ← REQUIRED for proper measurement
          }}
          data={displayPosts}
          computeItemKey={(_, post) => post.id} // 🔥 stable keys
          defaultItemHeight={420}
          itemContent={(_, post) => {
            if (!post?.id) return null;

            return (
              <div className="post-card-renderer-container">
                <PostCardRenderer
                  imageSet={derivePostImageVariants(post)}
                  currentUserUid={currentUser?.uid}
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
                      }),
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
                              mergeAndSetPosts(posts.map(normalizePost)),
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
          // scrollerRef={scrollerRefCallback}
        />
      )}
      {!showLoader && (
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
