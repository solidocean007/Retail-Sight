import { RefObject, useEffect } from "react";
import { VariableSizeList } from "react-window";
import { PostWithID } from "../utils/types";
import { useSearchParams } from "react-router-dom";
import { DisplayablePost } from "../components/ActivityFeed";

const useScrollToPost = (
  listRef: RefObject<VariableSizeList>,
  displayPosts: DisplayablePost[],
  AD_INTERVAL: number,
  adsOn: boolean = false, // optional toggle
) => {
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("postId");
  console.log("scrolled");
  useEffect(() => {
    if (!postId || !listRef.current || displayPosts.length === 0) return;

    const postIndex = displayPosts.findIndex((p) => p.id === postId);
    if (postIndex !== -1) {
      const adCountBeforePost =
        adsOn && AD_INTERVAL > 0 ? Math.floor(postIndex / AD_INTERVAL) : 0;

      const adjustedIndex = postIndex + adCountBeforePost;
      listRef.current.scrollToItem(adjustedIndex, "start");
    }
  }, [postId, displayPosts, listRef, AD_INTERVAL, adsOn]);
};

export default useScrollToPost;
