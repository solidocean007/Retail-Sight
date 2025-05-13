// Sidebar
import { forwardRef, useImperativeHandle, useState } from "react";
import { Button } from "@mui/material";
// import FilterSection from "./FilterSection";
import FilterLocation from "./FilterLocation";
import {
  fetchFilteredPosts,
  // fetchFilteredPosts,
  fetchInitialPostsBatch,
} from "../thunks/postsThunks";
import { useDispatch } from "react-redux";
import { ChannelType } from "./Create-Post/ChannelSelector";
import { CategoryType } from "./Create-Post/CategorySelector";
import { ChannelOptions, CategoryOptions } from "../utils/filterOptions";
import { useSelector } from "react-redux";
import { AppDispatch } from "../utils/store";
import { RootState } from "../utils/store";
import { clearLocationFilters } from "../Slices/locationSlice";
import "./sideBar.css";
import CustomAccordion from "./CustomAccordion";
import {
  addPostsToIndexedDB,
  // getFilteredPostsFromIndexedDB,
  getPostsFromIndexedDB,
  storeFilteredPostsInIndexedDB,
  // storeFilteredPostsInIndexedDB,
} from "../utils/database/indexedDBUtils";
import useProtectedAction from "../utils/useProtectedAction";
import {
  mergeAndSetFilteredPosts,
  mergeAndSetPosts,
  setFilteredPosts,
  setPosts,
} from "../Slices/postsSlice";
import DateFilter from "./DateFilter";
import { PostWithID } from "../utils/types";
import TagOnlySearchBar from "./TagOnlySearchBar";

export interface FilterState {
  channels: ChannelType[];
  categories: CategoryType[];
  states: string[];
  cities: string[];
  dateRange: { startDate: string | null; endDate: string | null };
  Hashtag: string | null;
  StarTag: string | null;
}

const POSTS_BATCH_SIZE = 5;

interface SideBarProps {
  currentHashtag: string | null;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
  currentStarTag: string | null;
  setCurrentStarTag: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch: () => Promise<void>;
  toggleFilterMenu: () => void;
  activePostSet: string;
  filteredPosts: PostWithID[];
  setActivePostSet: React.Dispatch<React.SetStateAction<string>>;
  isSearchActive: boolean;
  setIsSearchActive: React.Dispatch<React.SetStateAction<boolean>>;
  clearInput: boolean;
  setClearInput: React.Dispatch<React.SetStateAction<boolean>>;
  onFiltersApplied?: (filters: FilterState) => void;
}

export type SideBarHandle = {
  clearAllFilters: () => void;
};

const SideBar = forwardRef<SideBarHandle, SideBarProps>((props, ref) => {
  const {
    currentHashtag,
    setCurrentHashtag,
    currentStarTag,
    setCurrentStarTag,
    clearSearch,
    toggleFilterMenu,
    activePostSet,
    filteredPosts,
    setActivePostSet,
    isSearchActive,
    setIsSearchActive,
    clearInput,
    setClearInput,
    onFiltersApplied,
  } = props;

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const currentUserCompanyId = currentUser?.companyId;
  const protectedAction = useProtectedAction();
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>(
    []
  );
  const selectedStates = useSelector(
    (state: RootState) => state.locations.selectedStates
  );
  const selectedCities = useSelector(
    (state: RootState) => state.locations.selectedCities
  );

  // ✅ Expose a public method for parent
  useImperativeHandle(ref, () => ({
    clearAllFilters: clearFilters,
  }));

  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({
    startDate: null,
    endDate: null,
  });

  const [lastAppliedFilters, setLastAppliedFilters] = useState<FilterState>({
    channels: [],
    categories: [],
    states: [],
    cities: [],
    dateRange: { startDate: null, endDate: null },
    Hashtag: "",
    StarTag: "",
  });

  const handleDateChange = (newDateRange: {
    startDate: Date | null;
    endDate: Date | null;
  }) => {
    setDateRange({
      startDate: newDateRange.startDate
        ? newDateRange.startDate.toISOString()
        : null,
      endDate: newDateRange.endDate ? newDateRange.endDate.toISOString() : null,
    });
  };

  const dispatch = useDispatch<AppDispatch>();

  const applyFilters = async () => {
    dispatch(setFilteredPosts([]));

    const filters = {
      channels: selectedChannels,
      categories: selectedCategories,
      states: selectedStates,
      cities: selectedCities,
      dateRange: {
        startDate: dateRange.startDate ? dateRange.startDate.toString() : null,
        endDate: dateRange.endDate ? dateRange.endDate.toString() : null,
      },
      Hashtag: currentHashtag,
      StarTag: currentStarTag,
    };
    setLastAppliedFilters(filters);
    onFiltersApplied?.(filters);

    try {
      const actionResult = await dispatch(
        fetchFilteredPosts({ filters, currentHashtag, currentStarTag })
      );
      let fetchedPosts: PostWithID[] = actionResult.payload as PostWithID[];

      if (currentHashtag) {
        fetchedPosts = fetchedPosts.filter(
          (post) => post.hashtags && post.hashtags.includes(currentHashtag)
        );
      }

      if (currentStarTag) {
        fetchedPosts = fetchedPosts.filter(
          (post) => post.hashtags && post.starTags.includes(currentStarTag)
        );
      }

      const postsFilteredByDate = fetchedPosts.filter((post) => {
        const postDate = new Date(post.displayDate).getTime();

        const startDate = filters.dateRange.startDate
          ? new Date(filters.dateRange.startDate).getTime()
          : null;

        const endDate = filters.dateRange.endDate
          ? new Date(
              new Date(filters.dateRange.endDate).setHours(23, 59, 59, 999)
            ).getTime()
          : null;

        const matchesDateRange =
          (!startDate || postDate >= startDate) &&
          (!endDate || postDate <= endDate);

        return matchesDateRange;
      });

      setActivePostSet("filteredPosts");
      dispatch(mergeAndSetFilteredPosts(postsFilteredByDate));
      await storeFilteredPostsInIndexedDB(postsFilteredByDate, filters); //Type 'string | null' is not assignable to type 'Date | null'
      setCurrentHashtag(null);
      setCurrentStarTag(null);
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };

  const clearFilters = async () => {
    setClearInput(true); // Trigger input clearing
    setTimeout(() => setClearInput(false), 0); // Reset clearInput immediately after
    setActivePostSet("posts");
    setSelectedChannels([]);
    setSelectedCategories([]);
    setCurrentHashtag(null);
    setCurrentStarTag(null);
    setDateRange({ startDate: null, endDate: null });
    dispatch(clearLocationFilters());

    try {
      const cachedPosts = await getPostsFromIndexedDB();
      if (cachedPosts && cachedPosts.length > 0) {
        dispatch(mergeAndSetPosts(cachedPosts));
      } else {
        if (currentUserCompanyId && currentUserCompanyId) {
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompanyId })
          ).then((action) => {
            if (fetchInitialPostsBatch.fulfilled.match(action)) {
              const { posts } = action.payload;
              dispatch(setPosts(posts));
              addPostsToIndexedDB(posts);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error reloading posts from IndexedDB:", error);
    }
  };

  function arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    const sortedA = [...a].sort();
    const sortedB = [...b].sort();

    for (let i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) return false;
    }
    return true;
  }

  const handleApplyFiltersClick = () => {
    const dateRangeChanged =
      lastAppliedFilters.dateRange.startDate !== dateRange.startDate ||
      lastAppliedFilters.dateRange.endDate !== dateRange.endDate;

    const filtersChanged =
      !arraysEqual(selectedChannels, lastAppliedFilters.channels) ||
      !arraysEqual(selectedCategories, lastAppliedFilters.categories) ||
      !arraysEqual(selectedStates, lastAppliedFilters.states) ||
      !arraysEqual(selectedCities, lastAppliedFilters.cities) ||
      dateRangeChanged ||
      currentHashtag !== null ||
      currentStarTag !== null;

    if (filtersChanged) {
      protectedAction(applyFilters);
      if (window.innerWidth <= 900) {
        toggleFilterMenu();
      }
    }
  };

  const getFilterSummaryText = () => {
    const {
      channels,
      categories,
      states,
      cities,
      dateRange,
      Hashtag,
      StarTag,
    } = lastAppliedFilters;

    const parts: string[] = [];

    if (Hashtag) parts.push(`#${Hashtag}`);
    if (StarTag) parts.push(`⭐ ${StarTag}`);
    if (channels.length) parts.push(`Channels: ${channels.join(", ")}`);
    if (categories.length) parts.push(`Categories: ${categories.join(", ")}`);
    if (states.length) parts.push(`States: ${states.join(", ")}`);
    if (cities.length) parts.push(`Cities: ${cities.join(", ")}`);

    if (dateRange.startDate || dateRange.endDate) {
      const start = dateRange.startDate
        ? new Date(dateRange.startDate).toLocaleDateString()
        : "";
      const end = dateRange.endDate
        ? new Date(dateRange.endDate).toLocaleDateString()
        : "";

      if (start && end && start === end) {
        parts.push(`Date: ${start}`);
      } else {
        parts.push(`From ${start || "start"} to ${end || "end"}`);
      }
    }

    return parts.join(" • ");
  };

  const handleClearFiltersClick = () => {
    protectedAction(clearFilters);
    if (window.innerWidth <= 900) {
      toggleFilterMenu();
    }
  };

  const isApplyDisabled =
    selectedChannels.length === 0 &&
    selectedCategories.length === 0 &&
    selectedStates.length === 0 &&
    selectedCities.length === 0 &&
    dateRange.startDate === null &&
    currentHashtag === null &&
    currentStarTag === null;

  return (
    <div className="side-bar-box">
      <button className="close-side-bar-button" onClick={toggleFilterMenu}>
        Close filters
      </button>
      <div className="top-of-side-bar">
        <TagOnlySearchBar
          setCurrentStarTag={setCurrentStarTag}
          currentStarTag={currentStarTag}
          currentHashtag={currentHashtag}
          setCurrentHashtag={setCurrentHashtag}
          clearSearch={clearSearch}
          setActivePostSet={setActivePostSet}
          isSearchActive={isSearchActive}
          setIsSearchActive={setIsSearchActive}
          handleApplyFiltersClick={handleApplyFiltersClick}
          clearInput={clearInput}
        />
      </div>
      <div className="channel-category-box">
        <CustomAccordion<ChannelType>
          title="Channels"
          options={ChannelOptions}
          selected={selectedChannels}
          toggleOption={(option: ChannelType) => {
            setSelectedChannels((prev) =>
              prev.includes(option)
                ? prev.filter((c) => c !== option)
                : [...prev, option]
            );
          }}
        />
        <CustomAccordion<CategoryType>
          title="Categories"
          options={CategoryOptions}
          selected={selectedCategories}
          toggleOption={(option: CategoryType) => {
            setSelectedCategories((prev) =>
              prev.includes(option)
                ? prev.filter((c) => c !== option)
                : [...prev, option]
            );
          }}
        />
      </div>
      <div className="location-filter-container">
        <FilterLocation />
      </div>
      <div className="date-filter-container">
        <DateFilter
          dateRange={{
            startDate: dateRange.startDate
              ? new Date(dateRange.startDate)
              : null,
            endDate: dateRange.endDate ? new Date(dateRange.endDate) : null,
          }}
          onDateChange={handleDateChange}
        />
      </div>
      <div className="clear-apply-button-box">
        <button
          className="btn-outline"
          color="secondary"
          onClick={handleClearFiltersClick}
        >
          Clear Filters
        </button>
        <button
          className="btn-outline"
          color="primary"
          onClick={handleApplyFiltersClick}
          disabled={isApplyDisabled}
        >
          Apply Now
        </button>
      </div>
      {activePostSet === "filteredPosts" && (
        <div className="filter-summary-box">
          {filteredPosts.length > 0 ? (
            <div className="filter-summary">
              <p>
                Showing {filteredPosts.length} filtered post
                {filteredPosts.length > 1 ? "s" : ""} •{" "}
              </p>
              <p>{getFilterSummaryText()}</p>
            </div>
          ) : (
            <p>No posts match the current filters.</p>
          )}
        </div>
      )}
    </div>
  );
}); // ) expected

export default SideBar;
