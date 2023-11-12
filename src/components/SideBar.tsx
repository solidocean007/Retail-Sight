import React, { useState } from "react";
import { Button, Container, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsIcon from "@mui/icons-material/Notifications";
// import CheckBoxModal from "./CheckBoxModal";
import FilterSection from "./FilterSection";
import FilterDisplay from "./FilterDisplay";
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

interface SideBarProps {
  selectedChannels: ChannelType[];
  setSelectedChannels: React.Dispatch<React.SetStateAction<ChannelType[]>>;
  selectedCategories: CategoryType[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<CategoryType[]>>;
  selectedStates: never[];
  setSelectedStates: React.Dispatch<React.SetStateAction<never[]>>;
  selectedCities: never[];
  setSelectedCities: React.Dispatch<React.SetStateAction<never[]>>;
}

const SideBar: React.FC<SideBarProps> = ({
  selectedChannels,
  setSelectedChannels,
  selectedCategories,
  setSelectedCategories,
  selectedStates,
  setSelectedStates,
  selectedCities,
  setSelectedCities,
}) => {
  // const navigate = useNavigate();
  // const [modalOpen, setModalOpen] = useState(false);
  // const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  // const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const dispatch = useDispatch<AppDispatch>();

  // This function should not take parameters because it uses the state directly
  const applyFilters = () => {
    // Dispatch the fetchFilteredPosts action with the filters
    dispatch(
      fetchFilteredPosts({
        filters: {
          channels: selectedChannels,
          categories: selectedCategories,
        },
        // lastVisible: DocumentSnapshot, // not sure what to put here
      })
    );
  };

  const clearFilters = () => {
    // Clear the currently selected filters
    setSelectedChannels([]);
    setSelectedCategories([]);

    // Dispatch the fetchFilteredPosts action without any filters
    // dispatch(fetchFilteredPosts({ filters: { channels: [], categories: [],}, lastVisible:DocumentSnapshot }));
    dispatch(fetchFilteredPosts({ filters: { channels: [], categories: [] } }));
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
