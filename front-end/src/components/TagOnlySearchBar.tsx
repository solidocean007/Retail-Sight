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
import { mergeAndSetPosts, setHashtagPosts } from "../Slices/postsSlice";
import "./hashTagSearchBar.css";
import { RootState } from "../utils/store";

interface HashTagSearchBarProps {
  currentHashtag?: string | null;
  setCurrentHashtag?: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch?: () => Promise<void>;
  setActivePostSet?: React.Dispatch<React.SetStateAction<string>>;
  isSearchActive?: boolean;
  setIsSearchActive?: React.Dispatch<React.SetStateAction<boolean>>;
}

const TagOnlySearchBar: React.FC<HashTagSearchBarProps> = ({
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

  // Update inputValue when currentHashtag changes externally
  useEffect(() => {
    setInputValue(currentHashtag ?? "");
  }, [currentHashtag]);

  const handleSearch = async () => {
    // Process hashtag/star tag search directly
    if (!inputValue) return;
    if (setIsSearchActive) {
      setIsSearchActive(true);
    }
    let result;
    try {
      if (inputValue.startsWith("#")) {
        result = await getPostsByTag(inputValue, userCompanyID);
      } else if (inputValue.startsWith("*")) {
        result = await getPostsByStarTag(inputValue);
      } else {
        dispatch(showMessage("Invalid tag format"));
        return;
      }
      // how about a function that just sorts posts? then proceeeds to set redux and indexedDB
      dispatch(setHashtagPosts(result)); // I need a setSortedHashtagPosts
      // I need to save sorted posts to indexedDB
      // storeHashtagSearchIndexedDb();
      console.log("next step");
      if (setActivePostSet) {
        setActivePostSet("hashtag");
      }
      if (setCurrentHashtag) {
        setCurrentHashtag(inputValue);
      }
    } catch (error) {
      dispatch(showMessage("No posts for that search found"));
      // Handle error appropriately
      setInputValue(inputValue);
      if (setActivePostSet) {
        setActivePostSet("posts");
      }
    }
  };

  const handleClearSearch = () => {
    if (setActivePostSet) {
      setActivePostSet("posts");
    }
    if (setCurrentHashtag) {
      setCurrentHashtag("#");
    }
    if (clearSearch) {
      clearSearch();
    }
  };

  return (
    <div className="hashtag-search-box">
      <Input
        placeholder="Search with '#' or '*'"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
