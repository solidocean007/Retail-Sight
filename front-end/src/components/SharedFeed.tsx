// SharedFeed.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
import { RootState, useAppDispatch } from "../utils/store";
import NoResults from "./NoResults";
import "./activityFeed.css";
import BeerCaseStackAnimation from "./CaseStackAnimation/BeerCaseStackAnimation";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { getPostsByTag, getPostsByStarTag } from "../utils/PostLogic/getPostsByTag";
import { fetchMoreSharedPostsBatch } from "../thunks/sharedPostsThunks";
import { addSharedPosts, setHasMore } from "../Slices/sharedPostsSlice";
import { addSharedPostsToIndexedDB } from "../utils/database/sharedPostsStoreUtils";
// import { resolvePostImage } from "../utils/PostLogic/derivePostImageVariants";

const POSTS_BATCH_SIZE = 5;

interface SharedFeedProps {
  virtuosoRef?: React.RefObject<VirtuosoHandle>;
  postIdToScroll?: string;
  setPostIdToScroll?: React.Dispatch<React.SetStateAction<string | null>>;
  setSharedFeedPostSet?: React.Dispatch<
    React.SetStateAction<"posts" | "filteredPosts">
  >;
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

  const scrollToTop = () => {
    virtuosoRef?.current?.scrollToIndex({
      index: 0,
      align: "start",
      behavior: "smooth",
    });
  };

  // Start-up animation
  useEffect(() => {
    setShowLoader(true);
    const t = setTimeout(() => setShowLoader(false), 1000);
    return () => clearTimeout(t);
  }, []);

  // Preload first 5 images
  // useEffect(() => {
  //   const sample = sharedPosts.slice(0, 5);
  //   sample.forEach((post) => {
  //     // const { small, medium } = resolvePostImage(post);
  //     // const url = small[0] || medium[0];
  //     if (!url) return;
  //     const img = new Image();
  //     img.src = url;
  //   });
  // }, [sharedPosts]);

  // Scroll to deep-linked post
  useEffect(() => {
    if (!postIdToScroll || !virtuosoRef?.current) return;

    const idx = sharedPosts.findIndex((p) => p.id === postIdToScroll);
    if (idx === -1) return;

    const t = setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index: idx, align: "start" });
    }, 700);

    return () => clearTimeout(t);
  }, [postIdToScroll, sharedPosts, virtuosoRef]);

  // Safe no-results handling
  const noResults = !loading && sharedPosts.length === 0;

  // const computedImages = useMemo(
  //   () =>
  //     sharedPosts.map((post) => ({
  //       id: post.id,
  //       images: resolvePostImage(post),
  //     })),
  //   [sharedPosts]
  // );

  const scrollerRefCallback = useCallback((ref: any) => {
    if (!ref || !(ref instanceof HTMLElement)) return;
    ref.addEventListener("scroll", (e: any) => {
      const y = e.target.scrollTop;
      setShowScrollTop(y > 4000);
    });
  }, []);

  if (noResults) return <NoResults />;

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
          <BeerCaseStackAnimation minDuration={4000} maxStagger={2200} dropMs={900} loop />
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          style={{ height: "100dvh" }}
          data={sharedPosts}
          defaultItemHeight={450}
          itemContent={(index, post) => {
            if (!post?.id) return null;
            // const images = computedImages[index].images;

            return (
              <div key={post.id} className="post-card-renderer-container">
                {/* <PostCardRenderer
                  imageSet={images}
                  currentUserUid={currentUser?.uid}
                  index={index}
                  style={{ height: "100%" }}
                  data={{ post, getPostsByTag, getPostsByStarTag }}
                  setCurrentHashtag={setCurrentHashtag}
                  setActivePostSet={setSharedFeedPostSet}
                  setIsSearchActive={setIsSearchActive}
                  postIdToScroll={postIdToScroll}
                /> */}
              </div>
            );
          }}
          endReached={() => {
            if (loadingMore || !hasMore) return;

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
                  const { postsWithIds, lastVisible: newCursor, hasMore: more } =
                    action.payload;

                  setLastVisible(newCursor);

                  if (postsWithIds.length > 0) {
                    addSharedPostsToIndexedDB(postsWithIds);
                    dispatch(addSharedPosts(postsWithIds));
                    dispatch(setHasMore(more));
                  } else {
                    dispatch(setHasMore(false));
                  }
                }
              })
              .finally(() => setLoadingMore(false));
          }}
          components={{
            Footer: () =>
              loadingMore ? (
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
              ) : !hasMore ? (
                <div style={{ textAlign: "center", opacity: 0.6, padding: "1rem" }}>
                  🚩 End of shared posts
                </div>
              ) : null,
          }}
          scrollerRef={scrollerRefCallback}
        />
      )}

      {showScrollTop && !showLoader && (
        <button className="scroll-to-top-btn" onClick={scrollToTop}>
          <KeyboardArrowUpIcon />
        </button>
      )}
    </div>
  );
};

export default SharedFeed;
