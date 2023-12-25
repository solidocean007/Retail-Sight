import { Input } from "@mui/material";
import { showMessage } from "../Slices/snackbarSlice";
import getPostsByTag from "../utils/PostLogic/getPostsByTag";
import useProtectedAction from "../utils/useProtectedAction";
import { useDispatch } from "react-redux";
import { getPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { PostWithID } from "../utils/types";
import React from "react";
import { setPosts } from "../Slices/postsSlice";

const HashTagSearchBar = ({
  setSearchResults,
}: {
  setSearchResults: React.Dispatch<React.SetStateAction<PostWithID[] | null>>;
}) => {
  const protectedAction = useProtectedAction();
  const [searchTerm, setSearchTerm] = React.useState("#");
  const dispatch = useDispatch();
  const hashtagSearch = async () => {
    try {
      const hashtagPosts = await getPostsByTag(searchTerm);
      if (hashtagPosts.length === 0) {
        // Show snackbar message
        dispatch(showMessage("No posts for that search found"));
        // Load posts from IndexedDB or fetch again
        const cachedPosts = await getPostsFromIndexedDB();
        if (cachedPosts && cachedPosts.length > 0) {
          dispatch(setPosts(cachedPosts));
        } else {
          // Fetch posts again from Firestore
          // Your logic to fetch posts again
        }
      } else {
        setSearchResults(hashtagPosts);
      }
    } catch (error) {
      console.error("Error searching posts by hashtag:", error);
      // Optionally show an error message to the user
    }
  };

  const handleHashtagSearch = () => {
    if (searchTerm.length > 0) {
      protectedAction(() => {
        hashtagSearch();
      });
    }
  };
  return (
    <div className="theme-search-section">
      <div className="hashtag-search-box">
        {/* call the handleHashtagSearch on submit */}
        <Input
          placeholder="Search by hashtag"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleHashtagSearch();
            }
          }}
        />
        <button
          className="search-button"
          onClick={handleHashtagSearch}
          color="white"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default HashTagSearchBar;