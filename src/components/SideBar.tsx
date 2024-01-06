// Sidebar
import { useState } from "react";
import { Button } from "@mui/material";
// import FilterSection from "./FilterSection";
import FilterLocation from "./FilterLocation";
import { fetchLatestPosts, fetchFilteredPosts } from "../thunks/postsThunks";
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
import { getFilteredPostsFromIndexedDB, getPostsFromIndexedDB, storeFilteredPostsInIndexedDB } from "../utils/database/indexedDBUtils";
import useProtectedAction from "../utils/useProtectedAction";
import { setFilteredPosts, setPosts } from "../Slices/postsSlice";

interface FilterState {
  channels: ChannelType[];
  categories: CategoryType[];
  states: string[]; // Assuming these are arrays of strings
  cities: string[];
}

const SideBar = ({ toggleFilterMenu }: { toggleFilterMenu: () => void }) => {
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

   // State to track the last applied filters
   const [lastAppliedFilters, setLastAppliedFilters] = useState<FilterState>({
    channels: [],
    categories: [],
    states: [],
    cities: []
  });
  
  const dispatch = useDispatch<AppDispatch>();

  const applyFilters = async () => {
    // Construct the filter object
    const filters = {
      channels: selectedChannels,
      categories: selectedCategories,
      states: selectedStates,
      cities: selectedCities,
    };

    // First, attempt to get filtered posts from IndexedDB
    const cachedPosts = await getFilteredPostsFromIndexedDB(filters);
    if (cachedPosts.length > 0) {
      // If cached posts exist, use them and do not fetch from Firestore
      console.log("Using cached posts from IndexedDB");
      // You would dispatch an action to set these posts in your Redux store here
      dispatch(setFilteredPosts(cachedPosts));
      storeFilteredPostsInIndexedDB(cachedPosts, filters);
    } else {
      // If there are no cached posts, fetch from Firestore
      console.log("Fetching filtered posts from Firestore");
      dispatch(fetchFilteredPosts({ filters, lastVisible: null }));
    }
    // Update the last applied filters state
    setLastAppliedFilters({
      channels: selectedChannels, // Type 'string' is not assignable to type 'never'.
      categories: selectedCategories, // Type 'string' is not assignable to type 'never'.
      states: selectedStates, // Type 'string' is not assignable to type 'never'.
      cities: selectedCities // Type 'string' is not assignable to type 'never'.
    });
  };

  const clearFilters = async () => {
    // Clear local states for channels and categories
    setSelectedChannels([]);
    setSelectedCategories([]);
  
    // Dispatch actions to clear filters in Redux store
    dispatch(clearLocationFilters()); // This will reset both state and city filters in your Redux store
  
    // Reload posts from IndexedDB and update Redux
    try {
      const cachedPosts = await getPostsFromIndexedDB();
      if (cachedPosts && cachedPosts.length > 0) {
        dispatch(setPosts(cachedPosts));
      } else {
        // Optionally, fetch from the server if IndexedDB is empty
        dispatch(fetchLatestPosts());
      }
    } catch (error) {
      console.error('Error reloading posts from IndexedDB:', error);
      // Optionally, fetch from the server in case of an error
      dispatch(fetchLatestPosts());
    }
  };
  
  const arraysEqual = <T extends any[]>(a: T, b: T): boolean => { // Unexpected any. Specify a different type
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
  };
  
  const handleApplyFiltersClick = () => {
    // Check if current filters are different from the last applied filters
    const filtersChanged = !arraysEqual(selectedChannels, lastAppliedFilters.channels) ||
                           !arraysEqual(selectedCategories, lastAppliedFilters.categories) ||
                           !arraysEqual(selectedStates, lastAppliedFilters.states) ||
                           !arraysEqual(selectedCities, lastAppliedFilters.cities);
  
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
            selectedCities.length === 0 // Add this line to include city filter in the condition
          }
        >
          Apply Now
        </Button>
      </div>
    </div>
  );
};

export default SideBar;