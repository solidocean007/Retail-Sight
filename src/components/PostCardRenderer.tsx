import React from 'react';
import MemoizedPostCard from './PostCard';
import { PostType } from '../utils/types';

interface PostCardRendererProps {
  index: number;
  style: React.CSSProperties;
  data: {
    post: PostType; // This should be a single post object, not an array.
    getPostsByTag: (hashTag: string) => Promise<void>;
  };
}

const PostCardRenderer: React.FC<PostCardRendererProps> = ({ index, style, data: { post, getPostsByTag } }) => {
  // Safeguard check: Ensure that post is defined
  if (!post) {
    console.error('Post data is undefined at index:', index);
    return null; // Or render a placeholder/error component
  }

  return (
    <MemoizedPostCard
      post={post} 
      style={style} 
      getPostsByTag={getPostsByTag} // Now using the destructured function
      // ... any other props you need to pass
    />
  );
}


export default PostCardRenderer;
