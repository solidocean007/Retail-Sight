// HashTagSearchBar.tsx
import { Input } from "@mui/material";
import { showMessage } from "../Slices/snackbarSlice";
import {
  getPostsByStarTag,
  getPostsByTag,
} from "../utils/PostLogic/getPostsByTag";
import useProtectedAction from "../utils/useProtectedAction";
import { useDispatch, useSelector } from "react-redux";
import { getPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { PostWithID } from "../utils/types";
import React, { useEffect, useState } from "react";
import { mergeAndSetFilteredPosts, setHashtagPosts } from "../Slices/postsSlice";
import "./hashTagSearchBar.css";
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
}) => {
  const protectedAction = useProtectedAction(); // i need to use this to protect from a unwanted search
  const [inputValue, setInputValue] = useState("");
  const userCompanyID = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const dispatch = useDispatch();

  useEffect(() => {
    if (currentHashtag) {
      setInputValue(currentHashtag);
    } else if (currentStarTag) {
      setInputValue(currentStarTag);
    } else {
      setInputValue("");
    }
  }, [currentHashtag, currentStarTag]);

  const handleSearch = async () => {
    if (!inputValue) return;
    if (setIsSearchActive) setIsSearchActive(true);

    // if there is a space after # or * remove it
    if(inputValue.startsWith('#') || inputValue.startsWith("*")){
      inputValue[1] === " " ? inputValue.replace(' ', '') : inputValue;
    }

    let result: PostWithID[] = [];
    try {
      if (inputValue.startsWith("#")) {
        if (setCurrentHashtag) setCurrentHashtag(inputValue);
        if (setCurrentStarTag) setCurrentStarTag(null);
        result = await getPostsByTag(inputValue, userCompanyID);
      } else if (inputValue.startsWith("*")) {
        if (setCurrentStarTag) setCurrentStarTag(inputValue);
        if (setCurrentHashtag) setCurrentHashtag(null);
        result = await getPostsByStarTag(inputValue);
      } else {
        dispatch(showMessage("Invalid tag format"));
        return;
      }

      dispatch(mergeAndSetFilteredPosts(result));
      if (setActivePostSet) setActivePostSet("filtered");
    } catch (error) {
      dispatch(showMessage("No posts for that search found"));
      clearSearch && clearSearch();
    }
  };

  const handleClearSearch = () => {
    if (setActivePostSet) setActivePostSet("posts");
    if (setCurrentHashtag) setCurrentHashtag(null);
    if (setCurrentStarTag) setCurrentStarTag(null);
    if (clearSearch) clearSearch();
  };

  return (
    <div className="hashtag-search-box">
      <Input
        placeholder="Searching with '#' or '*'"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        sx={{margin: "0px"}}
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
