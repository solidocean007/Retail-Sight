// PostDescription.tsx
import styles from "./PostDescription.module.css";
import { useDispatch, useSelector } from "react-redux";
import { setHashtagPosts, setStarTagPosts } from "../Slices/postsSlice";
import { addHashtagPostsToIndexedDB, addStarTagPostsToIndexedDB } from "../utils/database/indexedDBUtils";
import { PostWithID } from "../utils/types";
import { useState } from "react";
import { RootState } from "../utils/store";

interface PostDescriptionProps {
  description?: string;
  getPostsByTag: (hashTag: string, companyID?: string) => Promise<PostWithID[]>;
  getPostsByStarTag: (starTag: string) => Promise<PostWithID[]>;
  setSearchResults: React.Dispatch<React.SetStateAction<PostWithID[] | null>>;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
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
  setSearchResults,
  setCurrentHashtag,
}) => {
  const dispatch = useDispatch();
  // const tags = description?.split(/\s+/);
  const [showModal, setShowModal] = useState(false);
  const userCompanyID = useSelector((state: RootState) => state.user.currentUser?.companyId);

  const processDescription = (text: string) => {
    return text.split(/\s+/).map((word, index) => {
      if (word.startsWith("#")) {
        return (
          <a key={index} href="#" onClick={(e) => handleHashtagClick(e, word)} className={styles.hashtag}>
            {word}
          </a>
        );
      } else if (word.startsWith("*")) {
        return (
          <a key={index} href="#" onClick={(e) => handleStarTagClick(e, word)} className={styles.starTag}>
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
    event.preventDefault(); // Prevents the default anchor behavior
    try {
      const hashtagPosts = await getPostsByTag(hashtag, userCompanyID); // Argument of type 'string | null' is not assignable to parameter of type 'string'

      setSearchResults(hashtagPosts);
      setCurrentHashtag(hashtag); // Type 'string' is not assignable to type 'SetStateAction<null>'
      dispatch(setHashtagPosts(hashtagPosts));
      addHashtagPostsToIndexedDB(hashtagPosts);
    } catch (error) {
      console.error("Error fetching posts by hashtag:", error);
      // Handle errors as needed (e.g., show a notification to the user)
    }
  };

  const handleStarTagClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    starTag: string
  ) => {
    event.preventDefault(); // Prevents the default anchor behavior
    try {
      const starTagPosts = await getPostsByStarTag(starTag); // Argument of type 'string | null' is not assignable to parameter of type 'string'

      setSearchResults(starTagPosts);
      setCurrentHashtag(starTag); // Type 'string' is not assignable to type 'SetStateAction<null>'
      dispatch(setStarTagPosts(starTagPosts));
      addStarTagPostsToIndexedDB(starTagPosts);
    } catch (error) {
      console.error("Error fetching posts by hashtag:", error);
      // Handle errors as needed (e.g., show a notification to the user)
    }
  };

  return (
    <>
      {renderDescription()}
      {showModal && (
        <DescriptionModal description={description} onClose={toggleModal} />
      )}
      {/* {tags?.map((tag, index) => {
        if (tag.startsWith("#")) {
          return (
            <span key={index} className={styles.hashtag}>
              <a href="" onClick={(event) => handleHashtagClick(event, tag)}>
                {tag}
              </a>
            </span>
          );
        }
        return tag + " ";
      })} */}
    </>
  );
};
