// Sidebar
import { useState } from "react";
import { Button } from "@mui/material";
// import FilterSection from "./FilterSection";
import FilterLocation from "./FilterLocation";
import {
  fetchFilteredPosts,
  // fetchFilteredPosts,
  fetchInitialPostsBatch,
} from "../thunks/postsThunks";
import { useDispatch } from "react-redux";
import { ChannelType } from "./ChannelSelector";
import { CategoryType } from "./CategorySelector";
import { ChannelOptions, CategoryOptions } from "../utils/filterOptions";
import { useSelector } from "react-redux";
import { AppDispatch } from "../utils/store";
import { RootState } from "../utils/store";
import { clearLocationFilters } from "../Slices/locationSlice";
import "./sideBar.css";
import CustomAccordion from "./CustomAccordion";
import {
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
} from "../Slices/postsSlice";
import DateFilter from "./DateFilter";
import { PostType, PostWithID } from "../utils/types";
import HashTagSearchBar from "./TagOnlySearchBar";
import { TagWithFilterSearchBar } from "./TagWithFilterSearchBar";

interface FilterState {
  channels: ChannelType[];
  categories: CategoryType[];
  states: string[]; // Assuming these are arrays of strings
  cities: string[];
  dateRange: { startDate: Date | null; endDate: Date | null };
}

const POSTS_BATCH_SIZE = 5;

interface SideBarProps {
  // setSearchResults: React.Dispatch<React.SetStateAction<PostWithID[] | null>>;
  currentHashtag: string | null;
  setCurrentHashtag: React.Dispatch<React.SetStateAction<string | null>>;
  clearSearch: () => Promise<void>;
  toggleFilterMenu: () => void;
  setActivePostSet: React.Dispatch<React.SetStateAction<string>>;
}

const SideBar: React.FC<SideBarProps> = ({
  // setSearchResults,
  currentHashtag,
  setCurrentHashtag,
  clearSearch,
  toggleFilterMenu,
  setActivePostSet,
}) => {
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const currentUserCompanyId = currentUser?.companyId;
  const currentUserCompany = currentUser?.company;
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

  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({ startDate: null, endDate: null });

  const handleDateChange = (newDateRange: {
    startDate: Date | null;
    endDate: Date | null;
  }) => {
    setDateRange(newDateRange);
  };

  // State to track the last applied filters
  const [lastAppliedFilters, setLastAppliedFilters] = useState<FilterState>({
    channels: [],
    categories: [],
    states: [],
    cities: [],
    dateRange: { startDate: null, endDate: null },
  });

  const dispatch = useDispatch<AppDispatch>();

  const applyFilters = async () => {
    dispatch(setFilteredPosts([]));
    const filters = {
      channels: selectedChannels,
      categories: selectedCategories,
      states: selectedStates,
      cities: selectedCities,
      dateRange: dateRange, // provided here so that last applied filters can be set
    };

    setLastAppliedFilters(filters);

    // Call fetchFilteredPosts thunk with filters
    // Note: Modify fetchFilteredPosts if it doesn't directly support all filters as shown
    try {
      const actionResult = await dispatch(
        fetchFilteredPosts({ filters, currentHashtag })
      );
      let fetchedPosts: PostWithID[] = actionResult.payload as PostWithID[];

      // Filter by currentHashtag if it's not null
      if (currentHashtag) {
        fetchedPosts = fetchedPosts.filter(
          (post) => post.hashtags && post.hashtags.includes(currentHashtag)
        );
      }

      // Optionally, handle date range filtering here if not handled by fetchFilteredPosts
      const postsFilteredByDate = fetchedPosts.filter((post) => {
        const postDate = new Date(post.displayDate).getTime();
        const startDate = dateRange.startDate
          ? new Date(dateRange.startDate).getTime()
          : null;
        const endDate = dateRange.endDate
          ? new Date(dateRange.endDate).getTime()
          : null;

        return (
          (!startDate || postDate >= startDate) &&
          (!endDate || postDate <= endDate)
        );
      });
      setActivePostSet("filtered"); // this is not a function error?
      dispatch(mergeAndSetFilteredPosts(postsFilteredByDate)); // this function sorts and merges
      storeFilteredPostsInIndexedDB(postsFilteredByDate, filters); // but does this one?
      setCurrentHashtag(null); // Reset the current hashtag
    } catch (error) {
      console.error("Error applying filters:", error);
      // Handle error (e.g., show an error message)
    }
  };

  const clearFilters = async () => {
    // Clear local states for channels and categories
    setActivePostSet("posts");
    setSelectedChannels([]);
    setSelectedCategories([]);
    setCurrentHashtag(null);
    setDateRange({ startDate: null, endDate: null });
    dispatch(clearLocationFilters());

    // Reload posts from IndexedDB and update Redux
    try {
      const cachedPosts = await getPostsFromIndexedDB();
      if (cachedPosts && cachedPosts.length > 0) {
        dispatch(mergeAndSetPosts(cachedPosts));
      } else {
        // Optionally, fetch from the server if IndexedDB is empty
        if (currentUserCompany && currentUserCompanyId) {
          dispatch(
            fetchInitialPostsBatch({ POSTS_BATCH_SIZE, currentUserCompanyId })
          );
        }
      }
    } catch (error) {
      console.error("Error reloading posts from IndexedDB:", error);
      // Optionally, fetch from the server in case of an error
    }
  };

  function arraysEqual<T>(a: T[], b: T[]): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    // Create copies of the arrays to sort, so the original arrays are not mutated
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
    // Check if current filters are different from the last applied filters
    const filtersChanged =
      !arraysEqual(selectedChannels, lastAppliedFilters.channels) ||
      !arraysEqual(selectedCategories, lastAppliedFilters.categories) ||
      !arraysEqual(selectedStates, lastAppliedFilters.states) ||
      !arraysEqual(selectedCities, lastAppliedFilters.cities) ||
      dateRangeChanged ||
      currentHashtag != null;

    if (filtersChanged) {
      protectedAction(applyFilters);
      if (window.innerWidth <= 900) {
        toggleFilterMenu();
      }
    }
  };

  const handleClearFiltersClick = () => {
    protectedAction(clearFilters);
    setCurrentHashtag(null);
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
    currentHashtag === null;

  return (
    <div className="side-bar-box">
      <button className="close-side-bar-button" onClick={toggleFilterMenu}>
        Close filters
      </button>
      <div className="top-of-side-bar">
        <TagWithFilterSearchBar
          currentHashtag={currentHashtag}
          setCurrentHashtag={setCurrentHashtag}
        />
      </div>
      <div className="channel-category-box">
        {/* <div className="filter-by-content"> */}
        <CustomAccordion<ChannelType>
          title="Channels"
          options={ChannelOptions}
          selected={selectedChannels}
          toggleOption={(option: ChannelType) => {
            // 'option' is a string
            setSelectedChannels((prev) =>
              prev.includes(option)
                ? prev.filter((c) => c !== option)
                : [...prev, option]
            );
          }}
        ></CustomAccordion>
        <CustomAccordion<CategoryType>
          title="Categories"
          options={CategoryOptions} // This should be an array of strings
          selected={selectedCategories} // This should be an array of strings representing selected categories
          toggleOption={(option: CategoryType) => {
            // 'option' is a string
            setSelectedCategories((prev) =>
              prev.includes(option)
                ? prev.filter((c) => c !== option)
                : [...prev, option]
            );
          }}
        />
        {/* </div> */}
      </div>
      <div className="location-filter-container">
        <FilterLocation />
      </div>
      <div className="date-filter-container">
        <DateFilter dateRange={dateRange} onDateChange={handleDateChange} />
      </div>
      <div className="clear-apply-button-box">
        <button
          className="btn"
          color="secondary"
          onClick={handleClearFiltersClick}
        >
          Clear Filters
        </button>
        <button
          className="btn"
          color="primary"
          onClick={handleApplyFiltersClick}
          disabled={isApplyDisabled}
        >
          Apply Now
        </button>
      </div>
    </div>
  );
};

export default SideBar;
