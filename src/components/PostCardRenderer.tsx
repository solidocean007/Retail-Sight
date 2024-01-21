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
    getPostsByStarTag: (starTag: string) => Promise<PostWithID[]>;
  };
  setSearchResults: React.Dispatch<React.SetStateAction<PostWithID[] | null>>;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
}

const PostCardRenderer: React.FC<PostCardRendererProps> = ({
  currentUserUid,
  index,
  style,
  data: { post, getPostsByTag },
  setSearchResults,
  setCurrentHashtag,
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
      getPostsByStarTag={getPostsByStarTag}
      setSearchResults={setSearchResults}
      setCurrentHashtag={setCurrentHashtag}
    />
  );
}

export default PostCardRenderer;