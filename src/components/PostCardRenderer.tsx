import React from 'react';
import MemoizedPostCard from './PostCard';
import { PostType } from '../utils/types';

interface PostCardRendererProps {
  id: string;
  currentUserUid?: string;
  index: number;
  style: React.CSSProperties;
  data: {
    post: PostType; // This should be a single post object, not an array.
    getPostsByTag: (hashTag: string) => Promise<PostType[]>;
  };
}

const PostCardRenderer: React.FC<PostCardRendererProps> = ({currentUserUid, index, style, data: { post, getPostsByTag } }) => {
  // Safeguard check: Ensure that post is defined
  if (!post) {
    console.error('Post data is undefined at index:', index);
    return null; // Or render a placeholder/error component
  }

  return (
    <MemoizedPostCard
      id={post.id} // id doesnt exsit on type posttype
      currentUserUid={currentUserUid} // Type 'string | undefined' is not assignable to type 'string'.
      // Type 'undefined' is not assignable to type 'string'.ts(2322)
    // PostCard.tsx(20, 3): The expected type comes from property 'currentUserUid' which is declared here on type 'IntrinsicAttributes & PostCardProps'
      post={post} 
      style={style} 
      getPostsByTag={getPostsByTag} // Now using the destructured function
      // ... any other props you need to pass
    />
  );
}


export default PostCardRenderer;
