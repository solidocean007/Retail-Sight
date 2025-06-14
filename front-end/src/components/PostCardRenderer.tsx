// PostCardRenderer.tsx
import React from "react";
import MemoizedPostCard from "./PostCard";
import { PostWithID } from "../utils/types";

interface PostCardRendererProps {
  currentUserUid?: string;
  index: number;
  style: React.CSSProperties;
  data: {
    post: PostWithID;
    getPostsByTag: (
      hashTag: string,
      companyId?: string,
    ) => Promise<PostWithID[]>;
    getPostsByStarTag: (starTag: string) => Promise<PostWithID[]>;
  };
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  postIdToScroll?: string | null;
}

const PostCardRenderer: React.FC<PostCardRendererProps> = ({
  currentUserUid,
  index,
  style,
  data: { post, getPostsByTag, getPostsByStarTag },
  setCurrentHashtag,
  setActivePostSet,
  setIsSearchActive,
  postIdToScroll
}) => {
  if (!post) {
    console.error("Post data is undefined at index:", index);
    return null;
  }
 

  return (
    <div style={{padding: "10px", ...style}}>
      <MemoizedPostCard
      id={post.id}
      currentUserUid={currentUserUid ?? ""} // Fallback to empty string if undefined
      post={post} // Now using post.data
      style={style}
      getPostsByTag={getPostsByTag}
      getPostsByStarTag={getPostsByStarTag}
      setCurrentHashtag={setCurrentHashtag}
      setActivePostSet={setActivePostSet}
      setIsSearchActive={setIsSearchActive}
      postIdToScroll={postIdToScroll}
    />
    </div>
    
  );
};

export default PostCardRenderer;
