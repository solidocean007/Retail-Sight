// HashTagSearchBarSidebar.tsx

import React, { useEffect, useState } from "react";
import { Input } from "@mui/material";
import "./hashTagSearchBar.css";

interface TagWithFilterSearchBarProps {
  currentHashtag: string | null;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
}

export const TagWithFilterSearchBar: React.FC<TagWithFilterSearchBarProps> = ({
  currentHashtag,
  setCurrentHashtag,
}) => {

  const [inputValue, setInputValue] = useState("");
  
  // Update inputValue when currentHashtag changes externally
  useEffect(() => {
    setInputValue(currentHashtag ?? "");
  }, [currentHashtag]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    // Update the currentHashtag as the user types
    if (newValue.startsWith('#') || newValue.startsWith('*')) {
      setCurrentHashtag(newValue);
    } else {
      // Optionally, reset currentHashtag if input doesn't start with '#' or '*'
      setCurrentHashtag(null);
    }
  };



  return (
    <div className="hashtag-search-box">
      <Input
        name="hashtag-with-filter-input"
        placeholder="Filter with '#' or '*'"
        value={inputValue}
        onChange={handleInputChange}
      />
    </div>
  );
};
