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
import { getPostsByTag, getPostsByStarTag } from "../utils/PostLogic/getPostsByTag";
import "./activityFeed.css";
import { useSharedPosts } from "../hooks/useSharedPosts";

const POSTS_BATCH_SIZE = 5;

interface SharedFeedProps {
  virtuosoRef: React.RefObject<VirtuosoHandle>;
  postIdToScroll: string | null;
  setPostIdToScroll: React.Dispatch<React.SetStateAction<string | null>>;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
}

const SharedFeed: React.FC<SharedFeedProps> = ({
  virtuosoRef,
  postIdToScroll,
  setPostIdToScroll,
  setActivePostSet,
  setIsSearchActive,
  setCurrentHashtag,
}) => {
  const dispatch = useAppDispatch();
  const [showLoader, setShowLoader] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const currentUser = useSelector((s: RootState) => s.user.currentUser);
  const currentUserCompanyId = currentUser?.companyId;

  // 🔹 Custom hook: get shared posts visible to this company
  const { posts: sharedPosts, fetchMore, hasMore, loading } = useSharedPosts(currentUserCompanyId, POSTS_BATCH_SIZE);

  // Auto-scroll handling
  const hasAutoScrolled = useRef(false);
  const handlePostVisible = (id: string, idx: number) => {
    if (hasAutoScrolled.current || id !== postIdToScroll) return;
    if (virtuosoRef.current) {
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
    if (!postIdToScroll || !virtuosoRef.current) return;
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
    return <NoResults message="No shared posts yet." />;
  }

  const scrollToTop = () => {
    virtuosoRef.current?.scrollToIndex({
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
                  setActivePostSet={setActivePostSet}
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
              fetchMore()
                .then(() => {
                  dispatch(mergeAndSetPosts(sharedPosts.map(normalizePost)));
                  addPostsToIndexedDB(sharedPosts);
                })
                .finally(() => setLoadingMore(false));
            }
          }}
          components={{
            Footer: () =>
              loadingMore ? (
                <div style={{ textAlign: "center", padding: "1rem" }}>
                  <CircularProgress size={24} />
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "1rem", opacity: 0.6 }}>
                  🚩 End of shared posts
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

export default SharedFeed;
