// Sidebar
import { useState } from "react";
import { Button } from "@mui/material";
// import FilterSection from "./FilterSection";
import FilterLocation from "./FilterLocation";
import {
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
  // storeFilteredPostsInIndexedDB,
} from "../utils/database/indexedDBUtils";
import useProtectedAction from "../utils/useProtectedAction";
import { mergeAndSetPosts, setFilteredPosts } from "../Slices/postsSlice";
import DateFilter from "./DateFilter";
import { PostType } from "../utils/types";
import LeftSideBar from "./LeftSideBar";

interface FilterState {
  channels: ChannelType[];
  categories: CategoryType[];
  states: string[]; // Assuming these are arrays of strings
  cities: string[];
  dateRange: { startDate: Date | null; endDate: Date | null };
}

const POSTS_BATCH_SIZE = 100;

const SideBar = ({ toggleFilterMenu }: { toggleFilterMenu: () => void }) => {
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

  const handleDateChange = (newDateRange: { startDate: Date | null, endDate: Date | null }) => {
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
  const allPosts = useSelector((state: RootState) => state.posts.posts); // this probably doesnt hold the value of all posts of the company anymore after adding pagination.

  const applyFilters = () => {
    // Function to check if a post falls within the selected date range
    const isWithinDateRange = (post: PostType) => {
      // Parse the post's display date as a Date object
      const postDate = new Date(post.displayDate);

      // Convert the start and end dates to Date objects if they are not null
      // For endDate, set the time to just before midnight to include the entire day
      const startDate = dateRange.startDate
        ? new Date(dateRange.startDate)
        : null;
      let endDate = dateRange.endDate ? new Date(dateRange.endDate) : null;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999); // Set to the last millisecond of the day
      }

      // Check if the post's date falls within the start and end date range
      return (
        (!startDate || postDate >= startDate) &&
        (!endDate || postDate <= endDate)
      );
    };

    const filteredPosts = allPosts.filter((post) => {
      const matchesChannel =
        !selectedChannels.length ||
        selectedChannels.includes(post.channel as ChannelType);
      const matchesCategory =
        !selectedCategories.length ||
        selectedCategories.includes(post.category as CategoryType);
      const matchesDateRange = isWithinDateRange(post);
      return matchesChannel && matchesCategory && matchesDateRange;
    });

    dispatch(setFilteredPosts(filteredPosts));

    // Update the last applied filters state
    setLastAppliedFilters({
      channels: selectedChannels,
      categories: selectedCategories,
      states: selectedStates,
      cities: selectedCities,
      dateRange:
        dateRange.startDate && dateRange.endDate
          ? {
              startDate: new Date(dateRange.startDate),
              endDate: new Date(dateRange.endDate),
            }
          : { startDate: null, endDate: null },
    });
  };

  const clearFilters = async () => {
    // Clear local states for channels and categories
    setSelectedChannels([]);
    setSelectedCategories([]);
    setDateRange({ startDate: null, endDate: null });
    // Dispatch actions to clear filters in Redux store
    dispatch(clearLocationFilters()); // This will reset both state and city filters in your Redux store

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
      dateRangeChanged;

    if (filtersChanged) {
      protectedAction(applyFilters);
      if (window.innerWidth <= 900) {
        toggleFilterMenu();
      }
    }
  };

  const handleClearFiltersClick = () => {
    protectedAction(clearFilters);
    if (window.innerWidth <= 900) {
      toggleFilterMenu();
    }
  };

  return (
    <div className="side-bar-box">
      <button className="close-side-bar-button" onClick={toggleFilterMenu}>
        Close filters
      </button>
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
        <DateFilter
          dateRange={dateRange}
          onDateChange={handleDateChange}
        />
      </div>
      <div className="clear-apply-button-box">
        <Button
          className="btn"
          variant="contained"
          color="secondary"
          onClick={handleClearFiltersClick}
        >
          Clear Filters
        </Button>
        <Button
          className="btn"
          variant="contained"
          color="primary"
          onClick={handleApplyFiltersClick}
          disabled={
            selectedChannels.length === 0 &&
            selectedCategories.length === 0 &&
            selectedStates.length === 0 &&
            selectedCities.length === 0 &&
            dateRange.startDate === null // Add this line to enable button if startDate is selected
          }
        >
          Apply Now
        </Button>
      </div>
      <div className="left-side-bar-container">
            <LeftSideBar />
          </div>
    </div>
  );
};

export default SideBar;
