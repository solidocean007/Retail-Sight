// HashTagSearchBar.tsx
import { Input } from "@mui/material";
import { showMessage } from "../Slices/snackbarSlice";
import { getPostsByStarTag, getPostsByTag } from "../utils/PostLogic/getPostsByTag";
import useProtectedAction from "../utils/useProtectedAction";
import { useDispatch, useSelector } from "react-redux";
import { getPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { PostWithID } from "../utils/types";
import React, { useEffect } from "react";
import { setPosts } from "../Slices/postsSlice";
import "./hashTagSearchBar.css";
import { RootState } from "../utils/store";

interface HashTagSearchBarProps {
  setSearchResults: React.Dispatch<React.SetStateAction<PostWithID[] | null>>;
  currentHashtag: string | null;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch: () => Promise<void>;
}

const HashTagSearchBar: React.FC<HashTagSearchBarProps> = ({
  setSearchResults,
  currentHashtag,
  setCurrentHashtag,
  clearSearch,
}) => {
  const protectedAction = useProtectedAction();
  const [searchTerm, setSearchTerm] = React.useState("#");
  const [lastSearchedTerm, setLastSearchedTerm] = React.useState<string | null>(null);
  const userCompanyID = useSelector((state: RootState) => state.user.currentUser?.companyId);
  const dispatch = useDispatch();

  // Effect to update searchTerm when currentHashtag changes
  useEffect(() => {
    setSearchTerm(currentHashtag ?? "");
  }, [currentHashtag]);

  const tagSearch = async () => {
    try {
      let tagPosts;
      if (searchTerm.startsWith("#")) {
        if (typeof userCompanyID !== 'undefined') { // Correct way to check for undefined
          tagPosts = await getPostsByTag(searchTerm, userCompanyID);
        } else {
          // Handle the case where userCompanyID is undefined
          // Maybe show an error or a message
          dispatch(showMessage("Your user company ID is undefined"));
          return;
        }
      } else if (searchTerm.startsWith("*")) {
        tagPosts = await getPostsByStarTag(searchTerm);
      } else {
        dispatch(showMessage("Invalid tag format"));
        return;
      }
  
      if (tagPosts && tagPosts.length === 0) {
        dispatch(showMessage("No posts for that search found"));
        const cachedPosts = await getPostsFromIndexedDB();
        if (cachedPosts && cachedPosts.length > 0) {
          dispatch(setPosts(cachedPosts));
        }
      } else if (tagPosts) {
        setSearchResults(tagPosts);
      }
    } catch (error) {
      console.error("Error searching posts by tag:", error);
    }
  };
  

  const handleTagSearch = () => {
    if (searchTerm !== "#" && searchTerm !== lastSearchedTerm) {
      protectedAction(tagSearch);
      setLastSearchedTerm(searchTerm);
      setCurrentHashtag(searchTerm);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("#");
    clearSearch();
    setLastSearchedTerm(null);
  };

  return (
    <div className="hashtag-search-box">
        {/* call the handleHashtagSearch on submit */}
        <Input
          placeholder="Search by hashtag '#' or asterisk tag '*'"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              currentHashtag ? handleClearSearch() : handleTagSearch();
            }
          }}
        />
       <button
          className="search-button"
          onClick={currentHashtag ? handleClearSearch : handleTagSearch}
        >
          {currentHashtag ? "Clear" : "Search"}
        </button>
      </div>
  );
};

export default HashTagSearchBar;
