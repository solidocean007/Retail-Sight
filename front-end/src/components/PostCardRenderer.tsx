// PostCardRenderer.tsx
import React, { useEffect, useRef } from "react";
import MemoizedPostCard from "./PostCard";
import { PostWithID } from "../utils/types";

export type FeedImageSet = {
  feedSrc: string | null;
  modalChain: string[];
};

interface PostCardRendererProps {
  imageSet: FeedImageSet | null;
  currentUserUid?: string;
  style: React.CSSProperties;
  data: {
    post: PostWithID;
    getPostsByTag: (
      hashTag: string,
      companyId?: string
    ) => Promise<PostWithID[]>;
    getPostsByStarTag: (starTag: string) => Promise<PostWithID[]>;
  };
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  setActivePostSet?: React.Dispatch<
    React.SetStateAction<"posts" | "filteredPosts">
  >;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  postIdToScroll?: string | null;
  onPostVisible?: (postId: string) => void;
}

const PostCardRenderer: React.FC<PostCardRendererProps> = ({
  imageSet,
  currentUserUid,
  style,
  data: { post, getPostsByTag, getPostsByStarTag },
  setCurrentHashtag,
  setActivePostSet,
  setIsSearchActive,
  postIdToScroll,
  onPostVisible,
}) => {
  if (!imageSet) return null;

  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!postIdToScroll || postIdToScroll !== post.id || !cardRef.current)
      return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && onPostVisible) {
          onPostVisible(post.id);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [postIdToScroll, post.id, onPostVisible]);

  return (
    <div className="memoized-post-card" ref={cardRef}>
      <MemoizedPostCard
        imageSet={imageSet}
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
