// Sidebar
import React, { useState } from "react";
import { Button, Container } from "@mui/material";
import FilterSection from "./FilterSection";
import FilterLocation from "./FilterLocation";
import { fetchLatestPosts, fetchFilteredPosts } from "../thunks/postsThunks";
import { useDispatch } from "react-redux";
import "./sideBar.css";
import { ChannelType } from "./ChannelSelector";
import { CategoryType } from "./CategorySelector";
import { ChannelOptions, CategoryOptions } from "../utils/filterOptions";
import { useSelector } from "react-redux";
import { AppDispatch } from "../utils/store";
import { RootState } from "../utils/store";
import { clearLocationFilters } from "../Slices/locationSlice";

const SideBar = () => {
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const selectedStates = useSelector((state: RootState) => state.locations.selectedStates);
  const selectedCities = useSelector((state: RootState) => state.locations.selectedCities);
  const dispatch = useDispatch<AppDispatch>();

  const applyFilters = () => {
    dispatch(fetchFilteredPosts({
      filters: {
        channels: selectedChannels,
        categories: selectedCategories,
        states: selectedStates,
        cities: selectedCities,
      },
    }));
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


  return (
    <Container className="side-bar-container">
      <aside>
        <div className="post-content-filter">
          <FilterSection
            title="Channels"
            options={ChannelOptions}
            selected={selectedChannels}
            toggleOption={(channel: ChannelType) => 
              setSelectedChannels(prev =>
                prev.includes(channel)
                  ? prev.filter(c => c !== channel)
                  : [...prev, channel]
              )
            }
          />
          <FilterSection
            title="Categories"
            options={CategoryOptions}
            selected={selectedCategories}
            toggleOption={(category: CategoryType) => 
              setSelectedCategories(prev =>
                prev.includes(category)
                  ? prev.filter(c => c !== category)
                  : [...prev, category]
              )
            }
          />
        </div>
        <FilterLocation />
        <Button className="btn" variant="outlined" color="secondary" onClick={clearFilters}>
          Clear Filters
        </Button>
        <Button
          className="btn"
          variant="contained"
          color="primary"
          onClick={applyFilters}
          disabled={
            selectedChannels.length === 0 &&
            selectedCategories.length === 0 &&
            selectedStates.length === 0 &&
            selectedCities.length === 0 // Add this line to include city filter in the condition
          }
        >
          Apply Now
        </Button>
      </aside>
    </Container>
  );
};

export default SideBar;

