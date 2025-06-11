// userHomePage.tsx
import { useEffect, useRef, useState } from "react";
import { VirtuosoHandle } from "react-virtuoso";
import ActivityFeed from "./ActivityFeed";
import "./userHomePage.css";
// import SideBar, { UIFilterState, SideBarHandle } from "./SideBar";
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
import { PostQueryFilters, PostWithID } from "../utils/types";
import { selectUser } from "../Slices/userSlice";
import { fetchUsersAccounts } from "../utils/userData/fetchUsersAccounts";
import { setReduxAccounts } from "../Slices/userAccountsSlice";
import FilterSummaryBanner from "./FilterSummaryBanner";
import EnhancedFilterSidebar from "./FilterSideBar/EnhancedFilterSideBar";
import { getFilterSummaryText } from "./FilterSideBar/utils/filterUtils";

export const UserHomePage = () => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [postIdToScroll, setPostIdToScroll] = useState<string | null>(null);
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
  const [isClosing, setIsClosing] = useState(false);
  const [lastFilters, setLastFilters] = useState<PostQueryFilters | null>(null);
  const posts = useSelector((state: RootState) => state.posts.posts);
  const filteredPosts = useSelector(
    (state: RootState) => state.posts.filteredPosts
  ); //

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("postId");
    if (id) setPostIdToScroll(id);
  }, []);

  const scrollToPost = useRef<(postId: string) => void>();

  let displayPosts: PostWithID[]; // why arent i using this?
  if (activePostSet === "filteredPosts") {
    displayPosts = filteredPosts;
  } else {
    displayPosts = posts;
  }

  // this looks like a top level tool to make sure a users accounts are stored.  im doing this again in a child component but
  // i shouldn't have to if this was working.. need to look into this a later.  preferably move it to a hook or something
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
    console.log("clicked toggleFilterMenu");
    if (isFilterMenuOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsFilterMenuOpen(false);
        setIsClosing(false);
      }, 400); // match animation time
    } else {
      setIsFilterMenuOpen(true);
    }
  };

  // const clearSearch = async () => {
  //   setCurrentHashtag(null);
  //   setCurrentStarTag(null);
  //   setActivePostSet("posts");
  //   dispatch(setFilteredPosts([]));
  //   setLastFilters(null); // ✅ hides FilterSummaryBanner

  //   // ✅ Clear filters inside SideBar
  //   // sideBarRef.current?.clearAllFilters(); // im not using sidebar anymore.. how can i clearAllFilters from activityfeed

  //   const cachedPosts = await getPostsFromIndexedDB();
  //   if (cachedPosts?.length > 0) {
  //     dispatch(mergeAndSetPosts(cachedPosts));
  //   }
  // };

  useEffect(() => {
    dispatch(fetchLocationOptions());
  }, [dispatch]);

  useEffect(() => {
    if (postIdToScroll && scrollToPost.current) {
      scrollToPost.current(postIdToScroll);
    }
  }, [postIdToScroll]);

  return (
    <>
      <UserHomePageHelmet />
      <div className="user-home-page-container">
        <div className="header-bar-container">
          <HeaderBar toggleFilterMenu={toggleFilterMenu} />
        </div>
        <div className="home-page-content">
          <div className="activity-feed-container">
            {/* <div className="filter-summary-mobile-banner">
              {activePostSet === "filteredPosts" && lastFilters && (
                <FilterSummaryBanner
                  filteredCount={filteredPosts.length}
                  filterText={getFilterSummaryText(lastFilters)} // ✅ use correct state
                  onClear={clearSearch}
                />
              )}
            </div> */}

            <ActivityFeed
              virtuosoRef={virtuosoRef}
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              currentStarTag={currentStarTag}
              setCurrentStarTag={setCurrentStarTag}
              // clearSearch={clearSearch}
              activePostSet={activePostSet}
              setActivePostSet={setActivePostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              clearInput={clearInput}
              postIdToScroll={postIdToScroll}
              setPostIdToScroll={setPostIdToScroll}
              toggleFilterMenu={toggleFilterMenu}
            />
          </div>

          <div
            className={`side-bar-container ${
              isFilterMenuOpen ? "sidebar-fullscreen" : ""
            } ${isClosing ? "sidebar-closing" : ""}`}
          >
            {/* <SideBar
              // setSearchResults={setSearchResults}
              // ref={sideBarRef}
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              setCurrentStarTag={setCurrentStarTag}
              currentStarTag={currentStarTag}
              clearSearch={clearSearch}
              toggleFilterMenu={toggleFilterMenu}
              activePostSet={activePostSet}
              filteredPosts={filteredPosts}
              setActivePostSet={setActivePostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              clearInput={clearInput}
              setClearInput={setClearInput}
              onFiltersApplied={setLastFilters}
            /> */}

            <EnhancedFilterSidebar
              activePostSet={activePostSet}
              setActivePostSet={setActivePostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              // onFiltersApplied={setLastFilters}
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              currentStarTag={currentStarTag}
              setCurrentStarTag={setCurrentStarTag}
              toggleFilterMenu={toggleFilterMenu}
            />
          </div>
        </div>
      </div>
    </>
  );
};
