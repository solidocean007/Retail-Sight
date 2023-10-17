import React from 'react';
import MemoizedPostCard from './PostCard';

interface PostCardRendererProps {
  index: number;
  style: React.CSSProperties;
  data: any; // Add your specific type here
}

const PostCardRenderer: React.FC<PostCardRendererProps> = ({ index, style, data }) => {
  
  const post = data.posts[index]; 
  // if (!post) {
  //   console.log('No post found for index:', index); // This will log if there's no post for the given index
  // } else {
  //   console.log('Using post for index:', index, post); // This will log the post being used
  // }

  return (
    <MemoizedPostCard
      post={post} 
      style={style} 
      getPostsByTag={data.getPostsByTag} 
      // ... any other props you need to pass
    />
  );
}

export default PostCardRenderer;

