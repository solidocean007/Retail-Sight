// PostDescription.tsx
import styles from "./PostDescription.module.css";
import { useDispatch, useSelector } from "react-redux";
import { setHashtagPosts, setStarTagPosts } from "../Slices/postsSlice";
import {
  addHashtagPostsToIndexedDB,
  addStarTagPostsToIndexedDB,
} from "../utils/database/indexedDBUtils";
import { PostWithID } from "../utils/types";
import { useState } from "react";
import { RootState } from "../utils/store";

interface PostDescriptionProps {
  description?: string;
  getPostsByTag: (hashTag: string, companyID?: string) => Promise<PostWithID[]>;
  getPostsByStarTag: (starTag: string) => Promise<PostWithID[]>;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
  setActivePostSet: React.Dispatch<React.SetStateAction<string>>;
  setIsSearchActive: React.Dispatch<React.SetStateAction<boolean>>;
}

const DescriptionModal = ({
  description,
  onClose,
}: {
  description: string | undefined;
  onClose: () => void;
}) => (
  <div className={styles.modalBackdrop}>
    <div className={styles.modalContent}>
      <p>{description}</p>
      <button onClick={onClose}>Close</button>
    </div>
  </div>
);

export const PostDescription: React.FC<PostDescriptionProps> = ({
  description,
  getPostsByTag,
  getPostsByStarTag,
  setCurrentHashtag,
  setActivePostSet,
  setIsSearchActive,
}) => {
  const dispatch = useDispatch();
  // const tags = description?.split(/\s+/);
  const [showModal, setShowModal] = useState(false);
  const userCompanyID = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );

  const processDescription = (text: string) => {
    return text.split(/\s+/).map((word, index) => {
      if (word.startsWith("#")) {
        return (
          <a
            key={index}
            href="#"
            onClick={(e) => handleHashtagClick(e, word)}
            className={styles.hashtag}
          >
            {word}
          </a>
        );
      } else if (word.startsWith("*")) {
        return (
          <a
            key={index}
            href="#"
            onClick={(e) => handleStarTagClick(e, word)}
            className={styles.starTag}
          >
            {word}
          </a>
        );
      }
      return word + " ";
    });
  };

  const toggleModal = () => {
    setShowModal(!showModal);
  };

  const renderDescription = () => {
    if (!description) return null;

    const processedDescription = processDescription(description);
    const truncatedDescription =
      description.length > 25
        ? processDescription(description.substring(0, 25))
        : processedDescription;

    return (
      <div className="render-description-box">
        <p>
          {truncatedDescription}
          {description.length > 25 && (
            <a href="#" onClick={toggleModal} className={styles.moreLink}>
              more...
            </a>
          )}
        </p>
      </div>
    );
  };

  const handleHashtagClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    hashtag: string
  ) => {
    console.log('click')
    event.preventDefault(); // Prevents the default anchor behavior
    try {
      const hashtagPosts = await getPostsByTag(hashtag, userCompanyID);
      setIsSearchActive(true);
      setActivePostSet("hashtag");
      setCurrentHashtag(hashtag);
      dispatch(setHashtagPosts(hashtagPosts));
      addHashtagPostsToIndexedDB(hashtagPosts);
    } catch (error) {
      console.error("Error fetching posts by hashtag:", error);
    }
  };

  const handleStarTagClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    starTag: string
  ) => {
    event.preventDefault(); // Prevents the default anchor behavior
    try {
      const starTagPosts = await getPostsByStarTag(starTag);

      setCurrentHashtag(starTag);
      dispatch(setStarTagPosts(starTagPosts));
      addStarTagPostsToIndexedDB(starTagPosts);
    } catch (error) {
      console.error("Error fetching posts by hashtag:", error);
    }
  };

  return (
    <>
      {renderDescription()}
      {showModal && (
        <DescriptionModal description={description} onClose={toggleModal} />
      )}
    </>
  );
};
