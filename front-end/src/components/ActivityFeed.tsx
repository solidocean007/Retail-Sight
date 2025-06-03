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
  postIdToScroll: string | null;
  setPostIdToScroll: React.Dispatch<React.SetStateAction<string | null>>;
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
  postIdToScroll,
  setPostIdToScroll,
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
                postIdToScroll={postIdToScroll}
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
