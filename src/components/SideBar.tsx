import React, { useState } from 'react';
import { Button, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckBoxModal from './CheckBoxModal';
import FilterSection from './FilterSection';
import FilterDisplay from './FilterDisplay';
import { useDispatch } from 'react-redux';
import { fetchFilteredPosts } from '../Slices/postsSlice';
// import { FilterCriteria } from '../Slices/postsSlice';
import './sideBar.css';
import { AppDispatch } from '../utils/store';
import { ChannelType } from '../utils/types';
import { CategoryType } from '../utils/types';
import { ChannelOptions } from '../utils/filterOptions';
import { CategoryOptions } from '../utils/filterOptions';

// We assume these types are correct based on your previous code.
// You should adjust these types based on actual channel and category types you have.
// type Channel = string;
// type Category = string;

interface SideBarProps {
  selectedChannels: ChannelType[];
  setSelectedChannels: React.Dispatch<React.SetStateAction<ChannelType[]>>;
  selectedCategories: CategoryType[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<CategoryType[]>>;
}

const SideBar: React.FC<SideBarProps> = ({ selectedChannels, setSelectedChannels, selectedCategories, setSelectedCategories }) => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  // const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  // const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const dispatch = useDispatch<AppDispatch>();


  const applyFilters = (channels: ChannelType[], categories: CategoryType[]) => {
    // Update the state with the selected channels and categories
    setSelectedChannels(channels);
    setSelectedCategories(categories);
  
    // Dispatch the fetchAllPosts action with the filters
    dispatch(fetchFilteredPosts({ filters: { channels, categories } }));
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((ch) => ch !== channel) : [...prev, channel]
    );
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((ct) => ct !== category) : [...prev, category]
    );
  };
  

  return (
    <aside className="sidebar">
      <FilterSection
        title="Channels"
        options={ChannelOptions}
        selected={selectedChannels}
        toggleOption={toggleChannel}
      />
      <FilterSection
        title="Categories"
        options={CategoryOptions}
        selected={selectedCategories}
        toggleOption={toggleCategory}
      />
      {/* Add other sections for Location and Time Frame here */}
    </aside>
  );
};

export default SideBar;




