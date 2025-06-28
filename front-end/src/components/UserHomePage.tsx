// userHomePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { VirtuosoHandle } from "react-virtuoso";
import ActivityFeed from "./ActivityFeed";
import "./userHomePage.css";
import { AppDispatch, RootState } from "../utils/store";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocationOptions } from "../Slices/locationSlice";
import HeaderBar from "./HeaderBar";
import { UserHomePageHelmet } from "../utils/helmetConfigurations";
import {
  addAccountsToIndexedDB,
  getFilteredSet,
  getPostsFromIndexedDB,
  getUserAccountsFromIndexedDB,
} from "../utils/database/indexedDBUtils";
import { mergeAndSetPosts, setFilteredPosts } from "../Slices/postsSlice";
import { PostQueryFilters, PostWithID } from "../utils/types";
import { selectCompanyUsers, selectUser } from "../Slices/userSlice";
import { fetchUsersAccounts } from "../utils/userData/fetchUsersAccounts";
import { setReduxAccounts } from "../Slices/userAccountsSlice";
import FilterSummaryBanner from "./FilterSummaryBanner";
import EnhancedFilterSidebar from "./FilterSideBar/EnhancedFilterSideBar";
import {
  getFilterHash,
  // getFilterHash,
  getFilterSummaryText,
} from "./FilterSideBar/utils/filterUtils";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchFilteredPostsBatch } from "../thunks/postsThunks";
import { normalizePost } from "../utils/normalizePost";

export const UserHomePage = () => {
  const navigate = useNavigate();
  const companyUsers = useSelector(selectCompanyUsers) || [];
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
  const [usersAccounts, setUsersAccounts] = useState<any[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [lastFilters, setLastFilters] = useState<PostQueryFilters | null>(null);
  const filterText = useMemo(
    () => (lastFilters ? getFilterSummaryText(lastFilters, companyUsers) : ""),
    [lastFilters, companyUsers]
  );

  // at top of UserHomePage.tsx
  const location = useLocation();
  const { filters: initialFilters, postIdToScroll: initialScrollId } =
    (location.state as {
      filters?: PostQueryFilters;
      postIdToScroll?: string;
    }) || {};

  // 1) When we get new filters, load the full set
  useEffect(() => {
    if (!initialFilters) return;
    setActivePostSet("filteredPosts");
    setLastFilters(initialFilters);

    (async () => {
      const cached = await getFilteredSet(initialFilters);
      if (cached) {
        dispatch(setFilteredPosts(cached));
      } else {
        const result = await dispatch(
          fetchFilteredPostsBatch({ filters: initialFilters })
        );
        if (fetchFilteredPostsBatch.fulfilled.match(result)) {
          dispatch(setFilteredPosts(result.payload.posts.map(normalizePost)));
        }
      }
    })();
  }, [initialFilters, dispatch]);

  // ─── ADD THIS AT THE TOP WITH YOUR OTHER HOOKS ───
  const filteredCount = useSelector(
    (state: RootState) => state.posts.filteredPostCount
  );
const filteredFetchedAt = useSelector(
  (state: RootState) => state.posts.filteredPostFetchedAt
);


  const toggleFilterMenu = () => {
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

  const clearSearch = async () => {
    setCurrentHashtag(null);
    setCurrentStarTag(null);
    setActivePostSet("posts");
    setLastFilters(null); // ✅ hides FilterSummaryBanner
    dispatch(setFilteredPosts([]));
    // dispatch(setFilteredPostCount(0)); // you'd need to define this reducer

    const cachedPosts = await getPostsFromIndexedDB();
    if (cachedPosts?.length > 0) {
      dispatch(mergeAndSetPosts(cachedPosts));
    }
  };

  useEffect(() => {
    dispatch(fetchLocationOptions());
  }, [dispatch]);

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
            dispatch(setReduxAccounts(fetchedAccounts));

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

  const filterHash = lastFilters ? getFilterHash(lastFilters) : null;
  const fetchedAt = filterHash ? filteredFetchedAt[filterHash] : undefined; // cannot find

  return (
    <>
      <UserHomePageHelmet />
      <div className="user-home-page-container">
        <div className="header-bar-container">
          <HeaderBar toggleFilterMenu={toggleFilterMenu} />
        </div>
        <div className="mobile-home-page-actions">
          {activePostSet === "filteredPosts" && filteredCount > 0 ? (
            <FilterSummaryBanner
              filteredCount={filteredCount}
              filterText={filterText}
              onClear={clearSearch}
              fetchedAt={fetchedAt} // Type 'Record<string, string>' is not assignable to type 'string'.
            />
          ) : (
            <div className="activity-feed-header-bar">
              <button
                onClick={toggleFilterMenu}
                className="btn-outline filter-menu-toggle"
              >
                Filters
              </button>
              <button
                onClick={() => navigate("/create-post")}
                className="btn-outline filter-menu-toggle"
              >
                Create Display
              </button>
            </div>
          )}
        </div>
        <div className="home-page-content">
          <div className="activity-feed-container">
            <ActivityFeed
              virtuosoRef={virtuosoRef}
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
              postIdToScroll={postIdToScroll}
              setPostIdToScroll={setPostIdToScroll}
              toggleFilterMenu={toggleFilterMenu}
              appliedFilters={lastFilters}
            />
          </div>

          <div
            className={`side-bar-container ${
              isFilterMenuOpen ? "sidebar-fullscreen" : ""
            } ${isClosing ? "sidebar-closing" : ""}`}
          >
            <EnhancedFilterSidebar
              activePostSet={activePostSet}
              setActivePostSet={setActivePostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              onFiltersApplied={setLastFilters}
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              currentStarTag={currentStarTag}
              setCurrentStarTag={setCurrentStarTag}
              toggleFilterMenu={toggleFilterMenu}
              initialFilters={initialFilters}
            />
          </div>
        </div>
      </div>
    </>
  );
};
