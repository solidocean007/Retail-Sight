import React, { useEffect, useCallback } from "react";
import { FixedSizeList as List } from "react-window";
import { useSelector } from "react-redux";
import PostCardRenderer from "./PostCardRenderer";
import NoContentCard from "./NoContentCard";
import { fetchMorePostsBatch } from "../thunks/postsThunks";
import { RootState } from "../utils/store";
import { useAppDispatch } from "../utils/store";
import { fetchInitialPostsBatch } from "../thunks/postsThunks";

const POST_BATCH_SIZE = 10;

const ActivityFeed = () => {
  const dispatch = useAppDispatch();
  const posts = useSelector((state: RootState) => state.posts.posts);
  const lastVisible = useSelector((state: RootState) => state.posts.lastVisible);
  const loading = useSelector((state: RootState) => state.posts.loading);

  const loadMorePosts = useCallback(() => {
    if (loading || !lastVisible) return;
    dispatch(fetchMorePostsBatch({ lastVisible, limit: POST_BATCH_SIZE })); // type mismatch
  }, [dispatch, loading, lastVisible]);

  useEffect(() => {
    dispatch(fetchInitialPostsBatch(POST_BATCH_SIZE)); // Fetch the initial batch of posts
  }, [dispatch]);

  const isItemLoaded = (index : number) => index < posts.length;

  const handleItemsRendered = ({ visibleStopIndex }: { visibleStopIndex: number }) => {
    if (isItemLoaded(visibleStopIndex)) {
      loadMorePosts();
    }
  };

  return (
    <>
      {posts.length === 0 ? (
        <NoContentCard />
      ) : (
        <List
          height={window.innerHeight}
          itemCount={posts.length}
          itemSize={900} // Adjust based on your item size
          width={650}
          onItemsRendered={handleItemsRendered}
          itemData={{ posts }}
        >
          {PostCardRenderer}
        </List>
      )}
    </>
  );
};

export default ActivityFeed;
