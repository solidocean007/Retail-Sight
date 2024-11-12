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
import { addAccountsToIndexedDB, getPostsFromIndexedDB, getUserAccountsFromIndexedDB } from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts, setFilteredPosts } from "../Slices/postsSlice";
import { VariableSizeList } from "react-window";
import { CompanyAccountType, PostWithID } from "../utils/types";
import useScrollToTopOnChange from "../hooks/scrollToTopOnChange";
import { selectUser } from "../Slices/userSlice";
import { fetchUsersAccounts } from "../utils/userData/fetchUserAccounts";
import { collection, doc, getDocs, updateDoc } from "@firebase/firestore";
import { db } from "../utils/firebase";
import { setReduxAccounts } from "../Slices/userAccountsSlice";
// import CheckBoxModal from "./CheckBoxModal";

export const UserHomePage = () => {
  const listRef = useRef<VariableSizeList>(null);
  const dispatch = useDispatch<AppDispatch>();
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [currentHashtag, setCurrentHashtag] = useState<string | null>(null);
  const [currentStarTag, setCurrentStarTag] = useState<string | null>(null);
  const [activePostSet, setActivePostSet] = useState("posts");
  const [clearInput, setClearInput] = useState(false);
  const user = useSelector(selectUser);
  const companyId = user?.companyId;
  const [usersAccounts, setUsersAccounts] = useState<CompanyAccountType[] | null>(null);

  const posts = useSelector((state: RootState) => state.posts.posts); // this is the current redux state of posts
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  ); // this is the state of redux filtered posts
  useScrollToTopOnChange(listRef, activePostSet);

  let displayPosts: PostWithID[];
  if (activePostSet === "filteredPosts") {
    displayPosts = filteredPosts;
  } else {
    displayPosts = posts;
  }

  useEffect(() => {
    if (!user || !companyId) return; // Ensure both user and companyId are defined
  
    async function fetchUserAccounts() {
      try {
        const userAccounts = await getUserAccountsFromIndexedDB();
        // Only fetch from Firestore if IndexedDB is empty and salesRouteNum exists
        if ((!userAccounts || userAccounts.length === 0) && user?.salesRouteNum) {
          // Fetch from Firestore where salesRouteNums includes user’s salesRouteNum
          const fetchedAccounts = await fetchUsersAccounts(companyId, user.salesRouteNum); // Type 'undefined' is not assignable to type 'string' for companyId
          if (fetchedAccounts.length > 0) {
            // Cache fetched accounts in IndexedDB
            setUsersAccounts(fetchedAccounts);
            setReduxAccounts(fetchedAccounts);
            await addAccountsToIndexedDB(fetchedAccounts);
          }
        } else if (!user?.salesRouteNum) {
          console.warn("User does not have a salesRouteNum; skipping account fetch.");
        }
      } catch (error) {
        console.error("Error fetching user accounts:", error);
      }
    }
  
    fetchUserAccounts();
  }, [user, companyId]);

  console.log(usersAccounts); // this logs null probably because setUsersAccounts is never called.  I want to add userAccounts to redux

  const toggleFilterMenu = () => {
    setIsFilterMenuOpen(!isFilterMenuOpen);
  };

  const clearSearch = async () => {
    setCurrentHashtag(null);
    setCurrentStarTag(null);
    setActivePostSet("posts");
    // Clear filteredPosts in Redux
    dispatch(setFilteredPosts([]));
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
              currentStarTag={currentStarTag}
              setCurrentStarTag={setCurrentStarTag}
              clearSearch={clearSearch}
              activePostSet={activePostSet}
              setActivePostSet={setActivePostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              clearInput={clearInput}
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
              setCurrentStarTag={setCurrentStarTag}
              currentStarTag={currentStarTag}
              clearSearch={clearSearch}
              toggleFilterMenu={toggleFilterMenu}
              setActivePostSet={setActivePostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              clearInput={clearInput}
              setClearInput={setClearInput}
            />
          </div>
        </div>
      </div>
    </>
  );
};
