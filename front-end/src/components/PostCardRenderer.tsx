// PostCardRenderer.tsx
import React, { useEffect, useRef } from "react";
import MemoizedPostCard from "./PostCard";
import { PostWithID } from "../utils/types";
import { ImageSetType } from "./ActivityFeed";

interface PostCardRendererProps {
  isScrolling: boolean;
  imageSet: ImageSetType;
  currentUserUid?: string;
  index: number;
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
  onPostVisible?: (postId: string, index: number) => void;
}

const PostCardRenderer: React.FC<PostCardRendererProps> = ({
  imageSet,
  currentUserUid,
  index,
  style,
  data: { post, getPostsByTag, getPostsByStarTag },
  setCurrentHashtag,
  setActivePostSet,
  setIsSearchActive,
  postIdToScroll,
  onPostVisible,
}) => {
  if (!post) {
    console.error("Post data is undefined at index:", index);
    return null;
  }

  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!postIdToScroll || postIdToScroll !== post.id || !cardRef.current)
      return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && onPostVisible) {
            onPostVisible(post.id, index); // Let parent know it’s visible
          }
          // console.log("Observed entry:", post.id, entry.isIntersecting);
        });
      },
      {
        root: null,
        threshold: 0.5, // Or 1.0 for stricter matching
      }
    );

    observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, [postIdToScroll, post.id, index, onPostVisible]);

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
