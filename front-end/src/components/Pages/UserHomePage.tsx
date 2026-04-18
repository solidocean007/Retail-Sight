// userHomePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { VirtuosoHandle } from "react-virtuoso";
import ActivityFeed from "./../ActivityFeed";
import "./userHomePage.css";
import { AppDispatch, RootState, useAppDispatch } from "../../utils/store";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocationOptions } from "../../Slices/locationSlice";
import HeaderBar from "./../HeaderBar";
import { UserHomePageHelmet } from "../../utils/helmetConfigurations";
import {
  getFilteredSet,
  getPostsFromIndexedDB,
} from "../../utils/database/indexedDBUtils";
import { mergeAndSetPosts, setFilteredPosts } from "../../Slices/postsSlice";
import { PostQueryFilters, PostWithID } from "../../utils/types";
import { selectCompanyUsers, selectUser } from "../../Slices/userSlice";
import FilterSummaryBanner from "./../FilterSummaryBanner";
import EnhancedFilterSidebar from "./../FilterSideBar/EnhancedFilterSideBar";
import { getFilterSummaryText } from "./../FilterSideBar/utils/filterUtils";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchFilteredPostsBatch } from "../../thunks/postsThunks";
import { normalizePost } from "../../utils/normalize";
import PostViewerModal from "./../PostViewerModal";
import TuneIcon from "@mui/icons-material/Tune";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import { Fab } from "@mui/material";
import SharedFeed from "../SharedFeed";
import { useSharedPosts } from "../../hooks/useSharedPosts";
import OnboardingSuccessModal from "./OnboardingSuccessModal";
import CustomConfirmation from "../CustomConfirmation";
import { setResetting } from "../../Slices/appSlice";
import { resetApp } from "../../utils/resetApp";
import { showMessage } from "../../Slices/snackbarSlice";
import InstallPrompt from "../PWA/InstallPrompt";
import { selectIsSupplier } from "../../Slices/currentCompanySlice";

const UserHomePage = () => {
  const navigate = useNavigate();
  const isSupplier = useSelector(selectIsSupplier);
  const companyId = useSelector(selectUser)?.companyId;
  const companyUsers = useSelector(selectCompanyUsers) || [];
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [postIdToScroll, setPostIdToScroll] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { resetting } = useSelector((state: RootState) => state.app);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [currentHashtag, setCurrentHashtag] = useState<string | null>(null);
  const [currentStarTag, setCurrentStarTag] = useState<string | null>(null);
  const [activeFeedType, setActiveFeedType] = useState<"company" | "shared">(
    isSupplier ? "shared" : "company",
  );
  const [activeCompanyPostSet, setActiveCompanyPostSet] = useState<
    "posts" | "filteredPosts"
  >("posts");
  const [activeSharedPostSet, setActiveSharedPostSet] = useState<
    "posts" | "filteredPosts"
  >("posts");
  const [clearInput, setClearInput] = useState(false);
  const user = useSelector(selectUser);
  const [isClosing, setIsClosing] = useState(false);
  const [lastFilters, setLastFilters] = useState<PostQueryFilters | null>(null);
  const filterText = useMemo(
    () => (lastFilters ? getFilterSummaryText(lastFilters, companyUsers) : ""),
    [lastFilters, companyUsers],
  );
  const [viewCompanyPosts, setViewCompanyPosts] = useState(true);
  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const [postViewerOpen, setPostViewerOpen] = useState(false);
  const batchSize = 5;
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [variant, setVariant] = useState<"submitted" | "approved">("submitted");

  // ─── ADD THIS AT THE TOP WITH YOUR OTHER HOOKS ───
  const filteredCount = useSelector(
    (state: RootState) => state.posts.filteredPostCount,
  );
  const fetchedAt = useSelector(
    (s: RootState) => s.posts.filteredPostFetchedAt,
  );

  const filteredSharedPostCount = useSelector(
    (s: RootState) => s.sharedPosts.filteredSharedPostCount,
  );

  const isFilteredMode =
    activeFeedType === "shared"
      ? activeSharedPostSet === "filteredPosts"
      : activeCompanyPostSet === "filteredPosts";

  const displayCount =
    activeFeedType === "shared" ? filteredSharedPostCount : filteredCount;

  useEffect(() => {
    if (isSupplier) {
      setActiveFeedType("shared");
    }
  }, [isSupplier]);

  useEffect(() => {
    const flag = localStorage.getItem("showOnboardingModal");
    if (flag) {
      setVariant(flag === "approved" ? "approved" : "submitted");
      setShowModal(true);
      localStorage.removeItem("showOnboardingModal");
    }
  }, []);

  // make sure sharedPosts are loaded so we can conditionally show the feed-tabs
  const { posts: sharedPosts, loading: sharedLoading } = useSharedPosts(
    user?.companyId,
    batchSize,
  );
  const hasShownSharedEmpty = useRef(false);

  useEffect(() => {
    if (
      activeFeedType === "shared" &&
      sharedPosts.length === 0 &&
      !hasShownSharedEmpty.current
    ) {
      dispatch(showMessage("No shared posts available."));
      hasShownSharedEmpty.current = true;
    }

    if (sharedPosts.length > 0) {
      hasShownSharedEmpty.current = false;
    }
  }, [activeFeedType, sharedPosts.length, dispatch]);

  const openPostViewer = (postId: string) => {
    setPostIdToView(postId);
    setPostViewerOpen(true);
  };

  // at top of UserHomePage.tsx
  const location = useLocation();
  const { filters: initialFilters, postIdToScroll: initialScrollId } =
    (location.state as {
      filters?: PostQueryFilters;
      postIdToScroll?: string;
    }) || {};

  const hasSetInitialScroll = useRef(false);
  useEffect(() => {
    if (hasSetInitialScroll.current) return;
    const state = location.state as {
      filters?: PostQueryFilters;
      postIdToScroll?: string;
    };
    if (state?.postIdToScroll) {
      setPostIdToScroll(state.postIdToScroll);
      hasSetInitialScroll.current = true;
    }
  }, [location.state]);

  // 1) When we get new filters, load the full set
  useEffect(() => {
    if (!initialFilters || !companyId) return;
    setActiveCompanyPostSet("filteredPosts");
    setLastFilters(initialFilters);

    (async () => {
      const cached = await getFilteredSet(initialFilters);
      if (cached) {
        dispatch(setFilteredPosts(cached));
      } else {
        const result = await dispatch(
          fetchFilteredPostsBatch({ filters: initialFilters, companyId }),
        );
        if (fetchFilteredPostsBatch.fulfilled.match(result)) {
          dispatch(setFilteredPosts(result.payload.posts.map(normalizePost)));
        }
      }
    })();
  }, [initialFilters, dispatch, companyId]);

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
    setActiveCompanyPostSet("posts");
    setLastFilters(null); // ✅ hides FilterSummaryBanner
    dispatch(setFilteredPosts([]));
    // dispatch(setFilteredPostCount(0)); // you'd need to define this reducer

    const cachedPosts = await getPostsFromIndexedDB();
    if (cachedPosts?.length > 0) {
      dispatch(mergeAndSetPosts(cachedPosts.map(normalizePost)));
    }
  };

  const confirmReset = async () => {
    dispatch(setResetting(true)); // ✅ fix
    try {
      await resetApp(dispatch);
      dispatch(showMessage("App reset complete. Reloading data..."));
    } catch (err) {
      console.error("Reset failed", err);
      dispatch(showMessage("Reset failed. Try again."));
    } finally {
      dispatch(setResetting(false)); // ✅ fix
      setShowConfirmReset(false);
    }
  };

  useEffect(() => {
    dispatch(fetchLocationOptions());
  }, [dispatch]);

  const handleFeedSwitch = (type: "company" | "shared") => {
    if (type === "shared") {
      if (sharedLoading) {
        dispatch(showMessage("Loading shared posts..."));
        return;
      }

      if (sharedPosts.length === 0) {
        dispatch(showMessage("No shared posts available."));
        return;
      }
    }

    setActiveFeedType(type);
  };

  return (
    <>
      <UserHomePageHelmet />
      <div className="user-home-page-container">
        <div className="header-bar-container">
          <HeaderBar
            toggleFilterMenu={toggleFilterMenu}
            openPostViewer={openPostViewer}
            onRequestReset={() => setShowConfirmReset(true)} // i dont think this ever really sets
          />
        </div>
        <div className="mobile-home-page-actions">
          {isFilteredMode && (
            <FilterSummaryBanner
              filteredCount={displayCount}
              filterText={filterText}
              onClear={clearSearch}
              fetchedAt={fetchedAt}
            />
          )}

          {!isFilterMenuOpen && !isClosing && (
            <div className="activity-feed-header-bar icon-bar">
              <Fab
                onClick={toggleFilterMenu}
                className="icon-button"
                title="Filters"
              >
                <TuneIcon />
              </Fab>

              <Fab
                color="primary"
                aria-label="create"
                onClick={() => navigate("/create-post")}
              >
                <AddAPhotoIcon />
              </Fab>
            </div>
          )}
        </div>

        <div className="home-page-content">
          <div className="activity-feed-container">
            <div className="feed-toggle">
              <button
                className={
                  activeFeedType === "company"
                    ? "btn-secondary active"
                    : "status-inactive"
                }
                onClick={() => handleFeedSwitch("company")}
              >
                Company
              </button>

              <button
                className={
                  activeFeedType === "shared"
                    ? "btn-secondary active"
                    : "status-inactive"
                }
                onClick={() => handleFeedSwitch("shared")}
              >
                Shared
              </button>
            </div>
            {activeFeedType === "shared" ? (
              <SharedFeed
                virtuosoRef={virtuosoRef}
                setPostIdToScroll={setPostIdToScroll}
                activeSharedPostSet={activeSharedPostSet}
                setSharedFeedPostSet={setActiveSharedPostSet}
              />
            ) : (
              <ActivityFeed
                virtuosoRef={virtuosoRef}
                currentHashtag={currentHashtag}
                setCurrentHashtag={setCurrentHashtag}
                currentStarTag={currentStarTag}
                setCurrentStarTag={setCurrentStarTag}
                clearSearch={clearSearch}
                activeCompanyPostSet={activeCompanyPostSet}
                setActiveCompanyPostSet={setActiveCompanyPostSet}
                isSearchActive={isSearchActive}
                setIsSearchActive={setIsSearchActive}
                clearInput={clearInput}
                postIdToScroll={postIdToScroll}
                setPostIdToScroll={setPostIdToScroll}
                toggleFilterMenu={toggleFilterMenu}
                appliedFilters={lastFilters}
              />
            )}
          </div>

          <div
            className={`side-bar-container ${
              isFilterMenuOpen ? "sidebar-fullscreen" : ""
            } ${isClosing ? "sidebar-closing" : ""}`}
          >
            <EnhancedFilterSidebar
              activePostSet={activeCompanyPostSet}
              activeSharedPostSet={activeSharedPostSet}
              setActiveCompanyPostSet={setActiveCompanyPostSet}
              setActiveSharedPostSet={setActiveSharedPostSet}
              isSearchActive={isSearchActive}
              setIsSearchActive={setIsSearchActive}
              onFiltersApplied={setLastFilters}
              currentHashtag={currentHashtag}
              setCurrentHashtag={setCurrentHashtag}
              currentStarTag={currentStarTag}
              setCurrentStarTag={setCurrentStarTag}
              toggleFilterMenu={toggleFilterMenu}
              initialFilters={initialFilters}
              isSharedFeed={activeFeedType === "shared"}
            />
          </div>
        </div>
        {postViewerOpen && postIdToView && (
          <PostViewerModal
            key={postIdToView} // ✅ here is fine
            postId={postIdToView}
            open={postViewerOpen}
            onClose={() => setPostViewerOpen(false)}
            currentUserUid={user?.uid}
          />
        )}
        {/* ✅ Confirmation Modal */}
        {showConfirmReset && (
          <CustomConfirmation
            isOpen={showConfirmReset}
            title="Confirm App Reset"
            message="This will clear cached data and reload everything. Continue?"
            onConfirm={confirmReset}
            onClose={() => setShowConfirmReset(false)}
            loading={resetting}
          />
        )}
        <OnboardingSuccessModal
          open={showModal}
          variant={variant}
          onClose={() => setShowModal(false)}
        />
      </div>
      <InstallPrompt user={user} />
    </>
  );
};

export default UserHomePage;
