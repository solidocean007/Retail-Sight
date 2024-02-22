// userHomePage.tsx
import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";
// import { useSelector } from "react-redux";
import "./userHomePage.css";
// import { RootState } from "../utils/store";
import SideBar from "./SideBar";
import { AppDispatch } from "../utils/store";
// import { ChannelType } from "./ChannelSelector";
// import { CategoryType } from "./CategorySelector";
import { useDispatch } from "react-redux";
import { fetchLocationOptions } from "../Slices/locationSlice";
import HeaderBar from "./HeaderBar";
// import LeftSideBar from "./LeftSideBar";
import { UserHomePageHelmet } from "../utils/helmetConfigurations";
import { PostWithID } from "../utils/types";
import { getPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts } from "../Slices/postsSlice";
// import CheckBoxModal from "./CheckBoxModal";

export const UserHomePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);

  const toggleFilterMenu = () => {
    setIsFilterMenuOpen(!isFilterMenuOpen);
  };
  const [currentHashtag, setCurrentHashtag] = React.useState<string | null>(
    null
  );
 
  const [activePostSet, setActivePostSet] = useState("posts"); // 'posts', 'filtered', 'hashtag'

  const clearSearch = async () => {
    setCurrentHashtag(null);
    setActivePostSet("posts");
    // Reload posts from IndexedDB
    const cachedPosts = await getPostsFromIndexedDB();
    if (cachedPosts && cachedPosts.length > 0) {
      dispatch(mergeAndSetPosts(cachedPosts));
    }
  };

  useEffect(() => {
    // I need to check if location options are in indexedDb before doing this next line.
    dispatch(fetchLocationOptions());
  }, [dispatch]);

  return (
    <>
      <UserHomePageHelmet />
      <div className="user-home-page-container">
        <div className="header-bar-container">
          <HeaderBar toggleFilterMenu={toggleFilterMenu} />
        </div>
        <div className="home-page-content">
          <div className="activity-feed-container">
            <ActivityFeed
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              clearSearch={clearSearch}
              activePostSet={activePostSet}
              setActivePostSet={setActivePostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
            />
          </div>

          <div
            className={`side-bar-container ${
              isFilterMenuOpen ? "sidebar-fullscreen" : ""
            }`}
          >
            <SideBar
              // setSearchResults={setSearchResults}
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              clearSearch={clearSearch}
              toggleFilterMenu={toggleFilterMenu}
              setActivePostSet={setActivePostSet}
            />
          </div>
        </div>
      </div>
    </>
  );
};
