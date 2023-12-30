// PostDescription.tsx
import styles from "./PostDescription.module.css";
import { useDispatch } from "react-redux";
import { setHashtagPosts } from "../Slices/postsSlice";
import { addHashtagPostsToIndexedDB } from "../utils/database/indexedDBUtils";
import { PostWithID } from "../utils/types";

interface PostDescriptionProps {
  description?: string;
  getPostsByTag:(hashTag: string) => Promise<PostWithID[]>;
  setSearchResults: React.Dispatch<React.SetStateAction<PostWithID[] | null>>;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
}

export const PostDescription: React.FC<PostDescriptionProps> = ({
  description,
  getPostsByTag,
  setSearchResults,
  setCurrentHashtag,
}) => {
  const dispatch = useDispatch();
  const tags = description?.split(/\s+/);

  const handleHashtagClick = async (
    event: React.MouseEvent<HTMLAnchorElement>,
    hashtag: string,
  ) => {
    event.preventDefault(); // Prevents the default anchor behavior
    try {
      const hashtagPosts = await getPostsByTag(hashtag); // Argument of type 'string | null' is not assignable to parameter of type 'string'

      setSearchResults(hashtagPosts); 
      setCurrentHashtag(hashtag); // Type 'string' is not assignable to type 'SetStateAction<null>'
      dispatch(setHashtagPosts(hashtagPosts)); 
      addHashtagPostsToIndexedDB(hashtagPosts);
    } catch (error) {
      console.error("Error fetching posts by hashtag:", error);
      // Handle errors as needed (e.g., show a notification to the user)
    }
  };

  return (
    <>
      {tags?.map((tag, index) => {
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
      })}
    </>
  );
};