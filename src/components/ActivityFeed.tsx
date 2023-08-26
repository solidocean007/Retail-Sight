// ActivityFeed.tsx
import React, { useEffect, useState } from "react";
import PostCard from "./PostCard";
import { FixedSizeList as List } from 'react-window';
import { PostType } from "../utils/types";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

interface PostCardRendererProps {
  index: number;
  style: React.CSSProperties;
}


const ActivityFeed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  const ITEM_HEIGHT = 700; // Adjust this based on your PostCard height
  
  // useEffect(() => {
  //   const fetchData = async () => {
  //     const db = getFirestore();
  //     const postCollection = collection(db, "posts");
  //     try{
  //       const postSnapshot = await getDocs(postCollection);
  //     const postData = postSnapshot.docs.map((doc) => ({
  //       ...doc.data(),
  //       id: doc.id,
  //     }));
  //     setPosts(postData);
  //     } catch (error) {
  //       console.error("Error fetching from Firestore:", error);
  //     }
      
  //   };

  //   fetchData();
  // }, []);

  const getPostsByTag = async (hashTag: string) => {
    const db = getFirestore();
    const postCollection = collection(db, 'posts');
    const postsByTagQuery = query(postCollection, where("hashtags", "array-contains", hashTag));

    try {
        const postSnapshot = await getDocs(postsByTagQuery);
        const postData = postSnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        }));
        setPosts(postData); 
    } catch (error) {
        console.error("Error fetching posts by hashtag:", error);
    }
  };

  const PostCardRenderer = ({ index, style }: PostCardRendererProps) => { // unexpected any
    const post = posts[index];
    return <PostCard key={post.id} post={post} getPostsByTag={getPostsByTag} style={style} />;
  };

  return (
    <List
      height={1000}  // Adjust this value based on how tall you want the visible window to be.
      itemCount={posts.length}
      itemSize={ITEM_HEIGHT}
      // width="100%"  // The list takes up the full width
      width={1000}  // The list takes up the full width
    >
      {PostCardRenderer}
    </List>
  );
};

export default ActivityFeed;

