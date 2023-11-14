// Sidebar
import React, { useState } from "react";
import { Button, Container, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsIcon from "@mui/icons-material/Notifications";
// import CheckBoxModal from "./CheckBoxModal";
import FilterSection from "./FilterSection";
import FilterDisplay from "./FilterDisplay";
import { fetchLatestPosts } from "../Slices/postsSlice";
import { useDispatch } from "react-redux";
import { fetchFilteredPosts } from "../Slices/postsSlice";
// import { FilterCriteria } from '../Slices/postsSlice';
import "./sideBar.css";
import { AppDispatch } from "../utils/store";
import { ChannelType } from "../utils/types";
import { CategoryType } from "../utils/types";
import { ChannelOptions } from "../utils/filterOptions";
import { CategoryOptions } from "../utils/filterOptions";
import FilterLocation from "./FilterLocation";
import { DocumentSnapshot } from "firebase/firestore";
import { createSelector } from "@reduxjs/toolkit";
import { selectAllPosts } from "../Slices/locationSlice";

// Define a memoized selector outside the component
export const selectFilteredPosts = createSelector(
  [
    selectAllPosts,
    (state: RootState) => state.locations.selectedStates,
    (state: RootState) => state.locations.selectedCities,
  ],
  (posts, selectedStates, selectedCities) => {
    return posts.filter((post) => {
      const matchesState =
        selectedStates.length === 0 || selectedStates.includes(post.state);
      const matchesCity =
        selectedCities.length === 0 || selectedCities.includes(post.city);
      return matchesState && matchesCity;
    });
  }
);

const SideBar = () => {
  // const navigate = useNavigate();
  // const [modalOpen, setModalOpen] = useState(false);
  // States for selected filters
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>(
    []
  );
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  

  const dispatch = useDispatch<AppDispatch>();

  // Apply filters based on the state managed within Sidebar
  const applyFilters = () => {
    console.log(selectedChannels, selectedCategories, ": filters")
    dispatch(
      fetchFilteredPosts({
        filters: {
          channels: selectedChannels,
          categories: selectedCategories,
        },
        // lastVisible: DocumentSnapshot
      })
    );
  };

  // Clear all filters and fetch latest posts
  const clearFilters = () => {
    setSelectedChannels([]);
    setSelectedCategories([]);
    setSelectedStates([]);
    setSelectedCities([]);

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
              setSelectedChannels((prev) =>
                prev.includes(channel)
                  ? prev.filter((c) => c !== channel)
                  : [...prev, channel]
              )
            }
          />
          <FilterSection
            title="Categories"
            options={CategoryOptions}
            selected={selectedCategories}
            toggleOption={(category: CategoryType) =>
              setSelectedCategories((prev) =>
                prev.includes(category)
                  ? prev.filter((c) => c !== category)
                  : [...prev, category]
              )
            }
          />
        </div>

        {/* Add other sections for Location and Time Frame here */}
        <div className="post-location-filter">
          <FilterLocation
            selectedStates={selectedStates}
            setSelectedStates={setSelectedStates}
            selectedCities={selectedCities}
            setSelectedCities={setSelectedCities}
            title="Location"
            // options={states}
            toggleOption={(states: CategoryType) =>
              setSelectedCategories((prev) =>
                prev.includes(category)
                  ? prev.filter((c) => c !== category)
                  : [...prev, category]
              )
            }
          />
        </div>
        <Button
          className="btn"
          variant="outlined"
          color="secondary"
          onClick={clearFilters}
        >
          Clear Filters
        </Button>
        <Button
          className="btn"
          variant="contained"
          color="primary"
          onClick={applyFilters}
          disabled={
            selectedChannels.length == 0 &&
            selectedCategories.length == 0 &&
            selectedStates.length == 0
          }
        >
          Apply Now
        </Button>
      </aside>
    </Container>
  );
};

export default SideBar;
