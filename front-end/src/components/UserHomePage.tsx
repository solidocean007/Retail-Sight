// userHomePage.tsx
import React, { useEffect, useRef, useState } from "react";
import ActivityFeed from "./ActivityFeed";
import "./userHomePage.css";
import SideBar from "./SideBar";
import { AppDispatch, RootState } from "../utils/store";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocationOptions } from "../Slices/locationSlice";
import HeaderBar from "./HeaderBar";
import { UserHomePageHelmet } from "../utils/helmetConfigurations";
import {  getPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts } from "../Slices/postsSlice";
import { VariableSizeList } from "react-window";
import { PostWithID } from "../utils/types";
import useScrollToTopOnChange from "../hooks/scrollToTopOnChange";
// import CheckBoxModal from "./CheckBoxModal";

export const UserHomePage = () => {
  const listRef = useRef<VariableSizeList>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [currentHashtag, setCurrentHashtag] = React.useState<string | null>(
    null
  );
 
  const [activePostSet, setActivePostSet] = useState("posts"); // 'posts', 'filtered', 'hashtag', 'starTag'
  const posts = useSelector((state: RootState) => state.posts.posts); // this is the current redux store of posts
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  );

  const hashtagPosts = useSelector(
    (state: RootState) => state.posts.hashtagPosts
  );

  const starTagPosts = useSelector(
    (state: RootState) => state.posts.starTagPosts
  );

  useScrollToTopOnChange(listRef, activePostSet);

 // Decide which posts to display based on the activePostSet state
let displayPosts: PostWithID[];
switch (activePostSet) {
  case "filtered":
    displayPosts = filteredPosts;
    break;
  case "hashtag":
    displayPosts = hashtagPosts;
    break;
  case "starTag": 
    displayPosts = starTagPosts;
    break;
  default:
    displayPosts = posts; // Fallback to the default posts if none of the above conditions are met
}

  const toggleFilterMenu = () => {
    setIsFilterMenuOpen(!isFilterMenuOpen);
  };

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
              listRef={listRef}
              posts={displayPosts}
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
