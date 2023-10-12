// ActivityFeed.tsx
import React, { useEffect } from "react";
import PostCard from "./PostCard";
import { FixedSizeList as List } from "react-window";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useSelector, useDispatch } from "react-redux";
import { setPosts } from "../Slices/postsSlice";
import { incrementRead } from "../Slices/firestoreReadsSlice";

interface PostCardRendererProps {
  index: number;
  style: React.CSSProperties;
}

const ActivityFeed: React.FC = () => {
  const posts = useSelector((state: any) => state.posts);
  const ITEM_HEIGHT = 700;
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      console.log("Fetching all posts...");
      const db = getFirestore();
      const postCollection = collection(db, "posts");
      try {
        const postSnapshot = await getDocs(postCollection);
        console.log(`Fetched ${postSnapshot.docs.length} posts.`);
        // dispatch(incrementRead());
        dispatch(incrementRead(postSnapshot.docs.length));

        const postData = postSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        dispatch(setPosts(postData));
      } catch (error) {
        console.error("Error fetching from Firestore:", error);
      }
    };
    fetchData();
  }, [dispatch]);

  const getPostsByTag = async (hashTag: string) => {
    console.log(`Fetching posts with hashtag: ${hashTag}`);
    const db = getFirestore();
    const postCollection = collection(db, "posts");
    const postsByTagQuery = query(
      postCollection,
      where("hashtags", "array-contains", hashTag)
    );

    try {
      const postSnapshot = await getDocs(postsByTagQuery);
      console.log(`Fetched ${postSnapshot.docs.length} posts by hashtag.`);
      dispatch(incrementRead(postSnapshot.docs.length)); // <-- Log read

      const postData = postSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      dispatch(setPosts(postData));
    } catch (error) {
      console.error("Error fetching posts by hashtag:", error);
    }
  };

  const PostCardRenderer: React.FC<PostCardRendererProps> = ({
    index,
    style,
  }) => {
    const post = posts[index];
    return (
      <PostCard
        key={post.id}
        post={post}
        getPostsByTag={getPostsByTag}
        style={style}
        setPosts={setPosts}
      />
    );
  };

  return (
    <List
      height={1000}
      itemCount={posts.length}
      itemSize={ITEM_HEIGHT}
      width={1000}
    >
      {PostCardRenderer}
    </List>
  );
};

export default ActivityFeed;
