// TagOnlySearchBar.tsx
import { Input } from "@mui/material";
import { showMessage } from "../Slices/snackbarSlice";
import {
  getPostsByStarTag,
  getPostsByTag,
} from "../utils/PostLogic/getPostsByTag";
import useProtectedAction from "../utils/useProtectedAction";
import { useDispatch, useSelector } from "react-redux";
import { getPostsFromIndexedDB } from "../utils/database/indexedDBUtils"; // unused?
import { PostWithID } from "../utils/types";
import React, { useEffect, useState } from "react";
import {
  mergeAndSetFilteredPosts,
  mergeAndSetPosts,
  setFilteredPosts,
  setHashtagPosts,
} from "../Slices/postsSlice";
import "./tagOnlySearchBar.css";
import { RootState } from "../utils/store";

interface TagOnlySearchBarProps {
  currentStarTag: string | null;
  setCurrentStarTag: React.Dispatch<React.SetStateAction<string | null>>;
  currentHashtag?: string | null;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch?: () => Promise<void>;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  isSearchActive?: boolean;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
  handleApplyFiltersClick?: () => void;
  clearInput: boolean;
}

const TagOnlySearchBar: React.FC<TagOnlySearchBarProps> = ({
  currentStarTag,
  setCurrentStarTag,
  currentHashtag,
  setCurrentHashtag,
  clearSearch,
  setActivePostSet,
  isSearchActive,
  setIsSearchActive,
  handleApplyFiltersClick,
  clearInput,
}) => {
  const protectedAction = useProtectedAction(); // i need to use this to protect from a unwanted search
  const [inputValue, setInputValue] = useState("");
  const userCompanyID = useSelector(
    (state: RootState) => state.user.currentUser?.companyId,
  );
  const dispatch = useDispatch();

  useEffect(() => {
    if (clearInput) {
      setInputValue("");
    }
    if (currentHashtag) {
      setInputValue(currentHashtag);
    } else if (currentStarTag) {
      setInputValue(currentStarTag);
    } else {
      setInputValue("");
    }
  }, [currentHashtag, currentStarTag, clearInput]);

  const handleSearch = async () => {
    if (!inputValue) return;
    if (setIsSearchActive) setIsSearchActive(true);

    let result: PostWithID[] = [];
    try {
      if (inputValue.startsWith("#")) {
        if (setCurrentHashtag) setCurrentHashtag(inputValue.trimEnd());
        if (setCurrentStarTag) setCurrentStarTag(null);
        result = await getPostsByTag(inputValue, userCompanyID);
      } else if (inputValue.startsWith("*")) {
        if (setCurrentStarTag) setCurrentStarTag(inputValue.trimEnd());
        if (setCurrentHashtag) setCurrentHashtag(null);
        result = await getPostsByStarTag(inputValue);
      } else {
        dispatch(showMessage("Invalid tag format"));
        return;
      }

      if (handleApplyFiltersClick) {
        handleApplyFiltersClick();
      }

      // dispatch(mergeAndSetFilteredPosts(result));
      dispatch(setFilteredPosts(result));
      if (setActivePostSet) setActivePostSet("filteredPosts");
    } catch (error) {
      dispatch(showMessage("No posts for that search found"));
      clearSearch && clearSearch();
    }
  };

  const handleClearSearch = async () => {
    if (clearSearch) {
      await clearSearch(); // Call the passed-in function to clear filters and search
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent default behavior
      handleSearch();
    }
  };

  return (
    <div className="hashtag-search-box">
      <Input
        placeholder="Searching with '#' or '*'"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value.trimEnd())}
        onKeyDown={handleKeyPress}
        sx={{
          backgroundColor: "var(--input-background)",
          color: "var(--input-text-color)",
          padding: "6px",
          borderRadius: "4px",
          fontSize: "1rem",
          marginRight: "8px",
          flexGrow: 2,
          minWidth: 0, // key to prevent it from overflowing
        }}
      />

      {/* I want the button below to be search if its a string that begins with either '#' or '*' if its  */}
      <button
        className="search-button"
        onClick={!isSearchActive ? handleSearch : handleClearSearch}
      >
        {isSearchActive ? "Clear" : "Search"}
      </button>
    </div>
  );
};

export default TagOnlySearchBar;
