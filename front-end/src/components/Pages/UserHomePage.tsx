// userHomePage.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  OpenPostViewerOptions,
  PostQueryFilters,
  PostWithID,
} from "../../utils/types";
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
import { selectEffectiveCompanyId } from "../../Slices/impersonationSlice";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../utils/firebase";

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
  toMillis(post.createdAt) ||
  toMillis(post.timestamp) ||
  toMillis(post.displayDate);

const UserHomePage = () => {
  const navigate = useNavigate();
  // const companyId = useSelector(selectUser)?.companyId;
  const effectiveCompanyId = useSelector(selectEffectiveCompanyId);
  const companyUsers = useSelector(selectCompanyUsers);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [postIdToScroll, setPostIdToScroll] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const { resetting } = useSelector((state: RootState) => state.app);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [currentHashtag, setCurrentHashtag] = useState<string | null>(null);
  const [currentStarTag, setCurrentStarTag] = useState<string | null>(null);
  const [activeFeedType, setActiveFeedType] =
    useState<"company" | "shared">("company");
  const [activeCompanyPostSet, setActiveCompanyPostSet] = useState<
    "posts" | "filteredPosts"
  >("posts");
  const [activeSharedPostSet, setActiveSharedPostSet] = useState<
    "posts" | "filteredPosts"
  >("posts");
  const [clearInput, setClearInput] = useState(false);
  const user = useSelector(selectUser);
  const [sharedFeedLastViewedAt, setSharedFeedLastViewedAt] = useState(0);
  const [sharedViewInitialized, setSharedViewInitialized] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [lastFilters, setLastFilters] = useState<PostQueryFilters | null>(null);
  const filterText = useMemo(
    () =>
      lastFilters ? getFilterSummaryText(lastFilters, companyUsers || []) : "",
    [lastFilters, companyUsers],
  );
  // const [viewCompanyPosts, setViewCompanyPosts] = useState(true);
  const [postViewerOptions, setPostViewerOptions] =
    useState<OpenPostViewerOptions | null>(null);
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
  const sharedFetchedAt = useSelector(
  (s: RootState) => s.sharedPosts.filteredSharedPostFetchedAt,
);
const displayFetchedAt =
  activeFeedType === "shared" ? sharedFetchedAt : fetchedAt;

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
    if (!initialFilters || !effectiveCompanyId) return;
    setActiveCompanyPostSet("filteredPosts");
    setLastFilters(initialFilters);

    (async () => {
      const cached = await getFilteredSet(initialFilters);
      if (cached) {
        dispatch(setFilteredPosts(cached));
      } else {
        const result = await dispatch(
          fetchFilteredPostsBatch({
            filters: initialFilters,
            companyId: effectiveCompanyId,
          }),
        );
        if (fetchFilteredPostsBatch.fulfilled.match(result)) {
          dispatch(setFilteredPosts(result.payload.posts.map(normalizePost)));
        }
      }
    })();
  }, [initialFilters, dispatch, effectiveCompanyId]);

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
          "feed-toggle-option " +
          (activeFeedType === "company" ? "active" : "")
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
          "feed-toggle-option " +
          (activeFeedType === "shared" ? "active" : "")
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
          {isFilteredMode && (
            <FilterSummaryBanner
              filteredCount={displayCount}
              filterText={filterText}
              onClear={clearSearch}
              fetchedAt={displayFetchedAt}
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
            {sharedPosts.length > 0 && (
              <div className="feed-toolbar">{renderFeedToggle()}</div>
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
        {postViewerOpen && (
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
