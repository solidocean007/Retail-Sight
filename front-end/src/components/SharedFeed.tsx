// SharedFeed.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
import { RootState, useAppDispatch } from "../utils/store";
import { CircularProgress } from "@mui/material";
import NoResults from "./NoResults";
import "./activityFeed.css";
import { addPostsToIndexedDB } from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts } from "../Slices/postsSlice";
import BeerCaseStackAnimation from "./CaseStackAnimation/BeerCaseStackAnimation";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { normalizePost } from "../utils/normalizePost";
import {
  getPostsByTag,
  getPostsByStarTag,
} from "../utils/PostLogic/getPostsByTag";
import "./activityFeed.css";
import { useSharedPosts } from "../hooks/useSharedPosts";
import { fetchMoreSharedPostsBatch } from "../thunks/sharedPostsThunks";
import { addSharedPosts, setHasMore } from "../Slices/sharedPostsSlice";
import { addSharedPostsToIndexedDB } from "../utils/database/sharedPostsStoreUtils";

const POSTS_BATCH_SIZE = 5;

interface SharedFeedProps {
  virtuosoRef?: React.RefObject<VirtuosoHandle>;
  postIdToScroll?: string;
  setPostIdToScroll?: React.Dispatch<React.SetStateAction<string | null>>;
 setSharedFeedPostSet?: React.Dispatch<React.SetStateAction<"posts" | "filteredPosts">>;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
}

const SharedFeed: React.FC<SharedFeedProps> = ({
  virtuosoRef,
  postIdToScroll,
  setPostIdToScroll,
  setSharedFeedPostSet,
  setIsSearchActive,
  setCurrentHashtag,
}) => {
  const dispatch = useAppDispatch();
  const [lastVisible, setLastVisible] = useState<string | null>(null);
  const [showLoader, setShowLoader] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentUser = useSelector((s: RootState) => s.user.currentUser);
  const sharedPosts = useSelector((s: RootState) => s.sharedPosts.sharedPosts);
  const hasMore = useSelector((s: RootState) => s.sharedPosts.hasMore);
  const loading = useSelector((s: RootState) => s.sharedPosts.loading);

  // Auto-scroll handling
  const hasAutoScrolled = useRef(false);
  const handlePostVisible = (id: string, idx: number) => {
    if (hasAutoScrolled.current || id !== postIdToScroll) return;
    if (virtuosoRef?.current && setPostIdToScroll) {
      virtuosoRef.current.scrollToIndex({ index: idx, align: "start" });
      setPostIdToScroll(null);
      hasAutoScrolled.current = true;
    }
  };

  // Small startup animation
  useEffect(() => {
    setShowLoader(true);
    const timeout = setTimeout(() => setShowLoader(false), 1000);
    return () => clearTimeout(timeout);
  }, []);

  // Scroll to post if deep-linked
  useEffect(() => {
    if (!postIdToScroll || !virtuosoRef?.current) return;
    const idx = sharedPosts.findIndex((p) => p.id === postIdToScroll);
    if (idx !== -1) {
      const timeout = setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: idx, align: "start" });
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [postIdToScroll, sharedPosts]);

  // Fallback
  if (!loading && sharedPosts.length === 0) {
    return <NoResults />;
  }

  const scrollToTop = () => {
    virtuosoRef?.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  };

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
          style={{ height: "100%", width: "100%" }}
          data={sharedPosts}
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
                  setActivePostSet={setSharedFeedPostSet} //  Type 'string' is not assignable to type '"posts" | "filteredPosts"'.
                  setIsSearchActive={setIsSearchActive}
                  postIdToScroll={postIdToScroll}
                  onPostVisible={handlePostVisible}
                />
              </div>
            );
          }}
          endReached={() => {
            if (!loadingMore && hasMore) {
              setLoadingMore(true);

              dispatch(
                fetchMoreSharedPostsBatch({
                  currentUser,
                  lastVisible,
                  limit: POSTS_BATCH_SIZE,
                })
              )
                .then((action) => {
                  if (fetchMoreSharedPostsBatch.fulfilled.match(action)) {
                    const {
                      postsWithIds,
                      lastVisible: newCursor,
                      hasMore: moreAvailable,
                    } = action.payload;
                    setLastVisible(newCursor);

                    if (postsWithIds.length > 0) {
                      addSharedPostsToIndexedDB(postsWithIds);
                      dispatch(addSharedPosts(postsWithIds));
                      dispatch(setHasMore(moreAvailable));

                    } else {
                      setHasMore(false);
                    }
                  }
                })
                .finally(() => setLoadingMore(false));
            }
          }}
          components={{
            Footer: () => {
              // 🔹 Show animation while fetching next batch
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

              // 🔹 Shared feed doesn’t use filters (yet)
              // But we can still gracefully show a terminal footer when no more posts exist
              if (!hasMore && !loading) {
                return (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1rem",
                      opacity: 0.6,
                    }}
                  >
                    🚩 End of shared posts
                  </div>
                );
              }

              // 🔹 Otherwise, show nothing
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

export default SharedFeed;
