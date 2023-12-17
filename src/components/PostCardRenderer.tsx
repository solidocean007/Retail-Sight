// PostCardRenderer.tsx
import React from 'react';
import MemoizedPostCard from './PostCard';
import { PostWithID } from '../utils/types';

interface PostCardRendererProps {
  currentUserUid?: string;
  index: number;
  style: React.CSSProperties;
  data: {
    post: PostWithID;
    getPostsByTag: (hashTag: string) => Promise<PostWithID[]>;
  };
}

const PostCardRenderer: React.FC<PostCardRendererProps> = ({
  currentUserUid,
  index,
  style,
  data: { post, getPostsByTag },
}) => {
  if (!post) {
    console.error('Post data is undefined at index:', index);
    return null;
  }

  return (
    <MemoizedPostCard
      id={post.id}
      currentUserUid={currentUserUid ?? ''} // Fallback to empty string if undefined
      post={post} // Now using post.data
      style={style}
      getPostsByTag={getPostsByTag}
    />
  );
}

export default PostCardRenderer;
