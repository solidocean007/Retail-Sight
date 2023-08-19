// ActivityFeed.tsx
import React, { useEffect, useState } from "react";
import PostCard from "./PostCard";
import { PostType } from "../utils/types"; // Assuming you have types defined somewhere
import { getFirestore, collection, getDocs } from "firebase/firestore";

const ActivityFeed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);

  const extractHashtags = (description) => {
    const hashtagPattern = /#\w+/g;
    return description.match(hashtagPattern) || [];
  };
  

  useEffect(() => {
    const fetchData = async () => {
      const db = getFirestore();
      const postCollection = collection(db, "posts");
      const postSnapshot = await getDocs(postCollection);
      const postData = postSnapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      setPosts(postData);
    };

    fetchData();
  }, []);

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
};

export default ActivityFeed;
