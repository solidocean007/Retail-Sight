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
import { getFilteredPostsFromIndexedDB } from "../utils/database/indexedDBUtils";
import useProtectedAction from "../utils/useProtectedAction";

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
      // For example: dispatch(setFilteredPosts(cachedPosts));
    } else {
      // If there are no cached posts, fetch from Firestore
      console.log("Fetching filtered posts from Firestore");
      dispatch(fetchFilteredPosts({ filters, lastVisible: null }));
    }
  };

  // In SideBar component
  const clearFilters = () => {
    // Clear local states for channels and categories
    setSelectedChannels([]);
    setSelectedCategories([]);

    // Dispatch actions to clear filters in Redux store
    dispatch(clearLocationFilters()); // This will reset both state and city filters in your Redux store

    // Fetch latest posts
    dispatch(fetchLatestPosts());
  };

  const handleApplyFiltersClick = () => {
    protectedAction(applyFilters);
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
