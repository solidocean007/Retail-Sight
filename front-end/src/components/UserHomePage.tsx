// userHomePage.tsx
import { useEffect, useRef, useState } from "react";
import ActivityFeed from "./ActivityFeed";
import "./userHomePage.css";
import SideBar from "./SideBar";
import { AppDispatch, RootState } from "../utils/store";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocationOptions } from "../Slices/locationSlice";
import HeaderBar from "./HeaderBar";
import { UserHomePageHelmet } from "../utils/helmetConfigurations";
import {
  addAccountsToIndexedDB,
  getPostsFromIndexedDB,
  getUserAccountsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts, setFilteredPosts } from "../Slices/postsSlice";
import { VariableSizeList } from "react-window";
import { PostWithID } from "../utils/types";
import useScrollToTopOnChange from "../hooks/scrollToTopOnChange";
import { selectUser } from "../Slices/userSlice";
import { fetchUsersAccounts } from "../utils/userData/fetchUsersAccounts";
import { setReduxAccounts } from "../Slices/userAccountsSlice";
import { Button } from "@mui/material";
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
  // const [usersAccounts, setUsersAccounts] = useState<CompanyAccountType[] | null>(null);
  const [usersAccounts, setUsersAccounts] = useState<any[]>([]);

  const posts = useSelector((state: RootState) => state.posts.posts);
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

// this looks like a top level tool to make sure a users accounts are stored.  im doing this again in a child component but
// i shouldnt have to if this was working.. need to look into this a later.  preferably move it to a hook or something
  useEffect(() => {
    if (!user || !companyId) return;

    const fetchUserAccounts = async (companyId: string) => {
      try {
        const userAccounts = await getUserAccountsFromIndexedDB();

        if (
          (!userAccounts || userAccounts.length === 0) &&
          user.salesRouteNum
        ) {
          const fetchedAccounts = await fetchUsersAccounts(
            companyId,
            user.salesRouteNum
          );
          if (fetchedAccounts.length > 0) {
            setUsersAccounts(fetchedAccounts);
            setReduxAccounts(fetchedAccounts);
            await addAccountsToIndexedDB(fetchedAccounts);
          }
        } else {
          setUsersAccounts(userAccounts);
        }
      } catch (error) {
        console.error("Error fetching user accounts:", error);
      }
    };

    fetchUserAccounts(companyId);
  }, [user, companyId]);

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
              // posts={displayPosts}
              posts={[...displayPosts, ...Array(3).fill({ id: `filler-${Math.random()}` })]}
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
