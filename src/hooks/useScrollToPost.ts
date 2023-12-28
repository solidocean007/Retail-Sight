// hooks/useScrollToPost.js
import { RefObject, useEffect } from 'react';
import { VariableSizeList } from "react-window";
import { PostWithID } from '../utils/types';


const useScrollToPost = (
  listRef: RefObject<VariableSizeList>, // Replace 'any' with the specific type if available
  displayPosts: PostWithID[],
  AD_INTERVAL: number
) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('postId');
    
    if (postId) {
      const postIndex = displayPosts.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
        const adCountBeforePost = Math.floor(postIndex / AD_INTERVAL);
        const adjustedIndex = postIndex + adCountBeforePost;
        listRef.current?.scrollToItem(adjustedIndex, 'start');
      }
    }
  }, [displayPosts, listRef, AD_INTERVAL]);
};

export default useScrollToPost;
