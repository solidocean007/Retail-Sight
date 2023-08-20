// ActivityFeed.tsx
import React, { useEffect, useState } from "react";
import PostCard from "./PostCard";
import { PostType } from "../utils/types"; // Assuming you have types defined somewhere
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const ActivityFeed: React.FC = () => {
  const [posts, setPosts] = useState<PostType[]>([]);
  // const [postsByHashTags, setPostsByHashTags] = useState([]);

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

  const getPostsByTag = async (hashTag: string) => {
    console.log("Fetching posts for hashtag:", hashTag); // 1. Logging the hashtag

    const db = getFirestore();
    const postCollection = collection(db, 'posts');
    const postsByTagQuery = query(postCollection, where("hashtags", "array-contains", hashTag));
    console.log("Constructed query:", postsByTagQuery); // This will print the query structure, may not be very informative

    try {
        const postSnapshot = await getDocs(postsByTagQuery);
        console.log("Snapshot fetched:", postSnapshot); // This will print snapshot details
        
        const postData = postSnapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id,
        }));

        console.log("Posts fetched by hashtag:", postData); // 2. Log the results

        setPosts(postData); // Directly set the fetched posts to the main state
    } catch (error) {
        console.error("Error fetching posts by hashtag:", error); // 3. Log any potential errors
    }
}



  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} getPostsByTag={getPostsByTag}/>
      ))}
    </div>
  );
};

export default ActivityFeed;
