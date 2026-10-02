// userHomePage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VirtuosoHandle } from "react-virtuoso";
import ActivityFeed from "./../ActivityFeed";
import "./userHomePage.css";
import { RootState, useAppDispatch } from "../../utils/store";
import { useSelector } from "react-redux";
import { fetchLocationOptions } from "../../Slices/locationSlice";
import HeaderBar from "./../HeaderBar";
import { UserHomePageHelmet } from "../../utils/helmetConfigurations";
import {
  getFilteredSet,
  getPostsFromIndexedDB,
} from "../../utils/database/indexedDBUtils";
import {
  mergeAndSetPosts,
  setFilteredPostFetchedAt,
  setFilteredPosts,
} from "../../Slices/postsSlice";
import {
  OpenPostViewerOptions,
  PostQueryFilters,
  PostWithID,
} from "../../utils/types";
import { selectUser } from "../../Slices/userSlice";
import FilterSummaryBanner from "./../FilterSummaryBanner";
import EnhancedFilterSidebar from "./../FilterSideBar/EnhancedFilterSideBar";
import { clearAllFilters } from "./../FilterSideBar/utils/filterUtils";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchFilteredPostsBatch } from "../../thunks/postsThunks";
import { fetchFilteredSharedPostsBatch } from "../../thunks/sharedPostsThunks";
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
import { selectEffectiveCompanyId } from "../../Slices/impersonationSlice";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";
import {
  setFilteredSharedPostFetchedAt,
  setFilteredSharedPosts,
} from "../../Slices/sharedPostsSlice";

type FeedType = "company" | "shared";

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Date.parse(value) || 0;
  if (value instanceof Date) return value.getTime();

  const timestamp = value as {
    toDate?: () => Date;
    seconds?: number;
  };

  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().getTime();
  }

  return typeof timestamp.seconds === "number" ? timestamp.seconds * 1000 : 0;
};

const getSharedPostTimestamp = (post: PostWithID): number =>
  toMillis(post.autoSharedAt) ||
  toMillis((post as PostWithID & { createdAt?: unknown }).createdAt) ||
  toMillis(post.timestamp) ||
  toMillis(post.displayDate);

const UserHomePage = () => {
  const navigate = useNavigate();
  // const companyId = useSelector(selectUser)?.companyId;
  const effectiveCompanyId = useSelector(selectEffectiveCompanyId);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [postIdToScroll, setPostIdToScroll] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { resetting } = useSelector((state: RootState) => state.app);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [currentHashtag, setCurrentHashtag] = useState<string | null>(null);
  const [currentStarTag, setCurrentStarTag] = useState<string | null>(null);
  const [activeFeedType, setActiveFeedType] = useState<FeedType>("company");
  const [showFeedContext, setShowFeedContext] = useState(true);
  const [activeCompanyPostSet, setActiveCompanyPostSet] = useState<
    "posts" | "filteredPosts"
  >("posts");
  const [activeSharedPostSet, setActiveSharedPostSet] = useState<
    "posts" | "filteredPosts"
  >("posts");
  const clearInput = false;
  const user = useSelector(selectUser);
  const [sharedFeedLastViewedAt, setSharedFeedLastViewedAt] = useState(0);
  const [sharedViewInitialized, setSharedViewInitialized] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [appliedFiltersByFeed, setAppliedFiltersByFeed] = useState<
    Record<FeedType, PostQueryFilters | null>
  >({ company: null, shared: null });
  const [filtersApplyingByFeed, setFiltersApplyingByFeed] = useState<
    Record<FeedType, boolean>
  >({ company: false, shared: false });
  const appliedFilters = appliedFiltersByFeed[activeFeedType];
  // const [viewCompanyPosts, setViewCompanyPosts] = useState(true);
  const [postViewerOptions, setPostViewerOptions] =
    useState<OpenPostViewerOptions | null>(null);
  const batchSize = 5;
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [variant, setVariant] = useState<"submitted" | "approved">("submitted");

  const isFilteredMode =
    activeFeedType === "shared"
      ? activeSharedPostSet === "filteredPosts"
      : activeCompanyPostSet === "filteredPosts";

  const filtersApplying = filtersApplyingByFeed[activeFeedType];

  const feedContextLabel =
    activeFeedType === "shared"
      ? "Posts shared with your company"
      : "Posts created by your company";

  useEffect(() => {
    setShowFeedContext(true);

    const timer = window.setTimeout(() => {
      setShowFeedContext(false);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [activeFeedType]);

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
    effectiveCompanyId || "",
    batchSize,
  );

  useEffect(() => {
    if (!user?.uid) {
      setSharedViewInitialized(false);
      setSharedFeedLastViewedAt(0);
      return;
    }

    let cancelled = false;
    const storageKey = `displaygram:shared-feed-viewed:${user.uid}`;
    let locallyViewedAt = 0;

    try {
      locallyViewedAt = Number(localStorage.getItem(storageKey)) || 0;
    } catch (error) {
      console.warn("Could not read shared-feed view state:", error);
    }

    const loadSharedFeedViewState = async () => {
      let savedViewedAt = 0;

      try {
        const settingsSnapshot = await getDoc(
          doc(db, "users", user.uid, "notificationSettings", "sharedFeed"),
        );
        savedViewedAt = toMillis(settingsSnapshot.data()?.lastViewedAt);
      } catch (error) {
        console.warn("Could not load shared-feed view state:", error);
      }

      if (cancelled) return;

      const viewedAt = Math.max(locallyViewedAt, savedViewedAt) || Date.now();

      setSharedFeedLastViewedAt(viewedAt);
      setSharedViewInitialized(true);

      try {
        localStorage.setItem(storageKey, String(viewedAt));
      } catch (error) {
        console.warn("Could not cache shared-feed view state:", error);
      }
    };

    loadSharedFeedViewState();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const unreadSharedCount = useMemo(() => {
    if (!sharedViewInitialized) return 0;

    return sharedPosts.filter(
      (post) => getSharedPostTimestamp(post) > sharedFeedLastViewedAt,
    ).length;
  }, [sharedFeedLastViewedAt, sharedPosts, sharedViewInitialized]);

  const markSharedFeedViewed = useCallback(() => {
    if (!user?.uid) return;

    const viewedAt = Date.now();
    const storageKey = `displaygram:shared-feed-viewed:${user.uid}`;

    setSharedFeedLastViewedAt(viewedAt);

    try {
      localStorage.setItem(storageKey, String(viewedAt));
    } catch (error) {
      console.warn("Could not cache shared-feed view state:", error);
    }

    setDoc(
      doc(db, "users", user.uid, "notificationSettings", "sharedFeed"),
      { lastViewedAt: serverTimestamp() },
      { merge: true },
    ).catch((error) =>
      console.warn("Could not save shared-feed view state:", error),
    );
  }, [user?.uid]);

  useEffect(() => {
    if (
      !sharedLoading &&
      activeFeedType === "shared" &&
      sharedPosts.length === 0
    ) {
      setActiveFeedType("company");
    }
  }, [activeFeedType, sharedLoading, sharedPosts.length]);

  useEffect(() => {
    if (
      activeFeedType === "shared" &&
      !sharedLoading &&
      sharedPosts.length > 0 &&
      sharedViewInitialized
    ) {
      markSharedFeedViewed();
    }
  }, [
    activeFeedType,
    markSharedFeedViewed,
    sharedLoading,
    sharedPosts.length,
    sharedViewInitialized,
  ]);

  const openPostViewer = (options: OpenPostViewerOptions) => {
    setPostViewerOptions(options);
  };

  // at top of UserHomePage.tsx
  const location = useLocation();
  const { filters: initialFilters } =
    (location.state as {
      filters?: PostQueryFilters;
      postIdToScroll?: string;
    }) || {};

  const hasSetInitialScroll = useRef(false);
  const hasHydratedInitialFilters = useRef(false);
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

  const handleFiltersApplied = useCallback((filters: PostQueryFilters) => {
    const feedType: FeedType =
      filters.feedType === "shared" ? "shared" : "company";

    setAppliedFiltersByFeed((current) => ({
      ...current,
      [feedType]: filters,
    }));
    setFiltersApplyingByFeed((current) => ({
      ...current,
      [feedType]: false,
    }));

    if (feedType === "shared") {
      setActiveSharedPostSet("filteredPosts");
    } else {
      setActiveCompanyPostSet("filteredPosts");
    }
  }, []);

  const handleApplyingChange = useCallback(
    (feedType: FeedType, applying: boolean) => {
      setFiltersApplyingByFeed((current) => ({
        ...current,
        [feedType]: applying,
      }));
    },
    [],
  );

  const clearFeedFilters = useCallback(
    async (feedType: FeedType) => {
      setAppliedFiltersByFeed((current) => ({
        ...current,
        [feedType]: null,
      }));
      setFiltersApplyingByFeed((current) => ({
        ...current,
        [feedType]: false,
      }));

      if (feedType === "shared") {
        setActiveSharedPostSet("posts");
        dispatch(setFilteredSharedPosts([]));
        dispatch(setFilteredSharedPostFetchedAt(null));
        return;
      }

      setCurrentHashtag(null);
      setCurrentStarTag(null);
      setIsSearchActive(false);
      setActiveCompanyPostSet("posts");
      dispatch(setFilteredPosts([]));
      dispatch(setFilteredPostFetchedAt(null));

      const cachedPosts = await getPostsFromIndexedDB();
      if (cachedPosts?.length > 0) {
        dispatch(mergeAndSetPosts(cachedPosts.map(normalizePost)));
      }
    },
    [dispatch],
  );

  // Hydrate navigation-provided filters once and only publish them after the
  // cache or Firestore request succeeds.
  useEffect(() => {
    if (
      hasHydratedInitialFilters.current ||
      !initialFilters ||
      !effectiveCompanyId
    ) {
      return;
    }

    hasHydratedInitialFilters.current = true;
    const feedType: FeedType =
      initialFilters.feedType === "shared" ? "shared" : "company";
    const filters = { ...initialFilters, feedType };
    setActiveFeedType(feedType);
    handleApplyingChange(feedType, true);

    (async () => {
      try {
        const cached = await getFilteredSet(filters);
        if (cached) {
          if (feedType === "shared") {
            dispatch(setFilteredSharedPosts(cached));
            dispatch(setFilteredSharedPostFetchedAt(new Date().toISOString()));
          } else {
            dispatch(setFilteredPosts(cached));
            dispatch(setFilteredPostFetchedAt(new Date().toISOString()));
          }
          handleFiltersApplied(filters);
          return;
        }

        if (feedType === "shared") {
          const result = await dispatch(
            fetchFilteredSharedPostsBatch({
              filters,
              companyId: effectiveCompanyId,
            }),
          );
          if (fetchFilteredSharedPostsBatch.fulfilled.match(result)) {
            setActiveFeedType("shared");
            handleFiltersApplied(filters);
            return;
          }
          throw new Error("Shared filter hydration failed");
        }

        const result = await dispatch(
          fetchFilteredPostsBatch({
            filters,
            companyId: effectiveCompanyId,
          }),
        );
        if (fetchFilteredPostsBatch.fulfilled.match(result)) {
          handleFiltersApplied(filters);
          return;
        }
        throw new Error("Company filter hydration failed");
      } catch (error) {
        console.error("Could not restore feed filters:", error);
        handleApplyingChange(feedType, false);
        dispatch(
          showMessage({
            text: "We could not restore those display filters.",
            severity: "error",
          }),
        );
      }
    })();
  }, [
    initialFilters,
    dispatch,
    effectiveCompanyId,
    handleApplyingChange,
    handleFiltersApplied,
  ]);

  const toggleFilterMenu = () => {
    if (isFilterMenuOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsFilterMenuOpen(false);
        setIsClosing(false);
      }, 280); // match the mobile panel animation
    } else {
      setIsFilterMenuOpen(true);
    }
  };

  const clearSearch = useCallback(
    () => clearFeedFilters(activeFeedType),
    [activeFeedType, clearFeedFilters],
  );

  useEffect(() => {
    if (!currentHashtag && !currentStarTag) return;

    const tagFilters: PostQueryFilters = {
      ...clearAllFilters("company"),
      hashtag: currentHashtag,
      starTag: currentStarTag,
    };

    setAppliedFiltersByFeed((current) => ({
      ...current,
      company: tagFilters,
    }));
  }, [currentHashtag, currentStarTag]);

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
    if (type === "shared" && sharedLoading) {
      dispatch(showMessage("Loading shared displays..."));
      return;
    }

    setActiveFeedType(type);
  };
  const renderFeedToggle = () => (
    <div className="feed-toggle" role="tablist" aria-label="Display feed">
      <button
        className={
          "feed-toggle-option " + (activeFeedType === "company" ? "active" : "")
        }
        type="button"
        role="tab"
        aria-selected={activeFeedType === "company"}
        onClick={() => handleFeedSwitch("company")}
      >
        Company
      </button>

      <button
        className={
          "feed-toggle-option " + (activeFeedType === "shared" ? "active" : "")
        }
        type="button"
        role="tab"
        aria-selected={activeFeedType === "shared"}
        onClick={() => handleFeedSwitch("shared")}
      >
        Shared
        {activeFeedType !== "shared" && unreadSharedCount > 0 && (
          <span
            className="shared-unread-badge"
            aria-label={unreadSharedCount + " unread shared displays"}
          >
            {unreadSharedCount > 9 ? "9+" : unreadSharedCount}
          </span>
        )}
      </button>
    </div>
  );

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
          {!isFilterMenuOpen && !isClosing && (
            <div className="activity-feed-header-bar icon-bar">
              <Fab
                onClick={toggleFilterMenu}
                className="icon-button"
                title="Filters"
              >
                <TuneIcon />
              </Fab>

              {sharedPosts.length > 0 && renderFeedToggle()}

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
            {(isFilteredMode || filtersApplying) && (
              <FilterSummaryBanner
                onClear={clearSearch}
                onEdit={toggleFilterMenu}
                isLoading={filtersApplying}
              />
            )}
            {sharedPosts.length > 0 && (
              <div className="feed-toolbar">
                <span
                  className={`feed-context-message ${
                    showFeedContext ? "visible" : ""
                  }`}
                  aria-live="polite"
                >
                  {feedContextLabel}
                </span>
                {renderFeedToggle()}
              </div>
            )}
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
                appliedFilters={appliedFiltersByFeed.company}
              />
            )}
          </div>

          <div
            className={`side-bar-container ${
              isFilterMenuOpen ? "sidebar-fullscreen" : ""
            } ${isClosing ? "sidebar-closing" : ""}`}
          >
            <EnhancedFilterSidebar
              appliedFilters={appliedFilters}
              onFiltersApplied={handleFiltersApplied}
              onClearFilters={clearFeedFilters}
              onApplyingChange={handleApplyingChange}
              toggleFilterMenu={toggleFilterMenu}
              isSharedFeed={activeFeedType === "shared"}
            />
          </div>
        </div>
        {postViewerOptions?.postId && (
          <PostViewerModal
            postId={postViewerOptions?.postId ?? null}
            open={Boolean(postViewerOptions?.postId)}
            onClose={() => setPostViewerOptions(null)}
            currentUserUid={user?.uid}
            initialOpenComments={postViewerOptions?.openComments ?? false}
            focusCommentId={postViewerOptions?.focusCommentId ?? null}
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
