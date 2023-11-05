import React, { useState } from 'react';
import { Button, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckBoxModal from './CheckBoxModal';
import FilterDisplay from './FilterDisplay';
import { useDispatch } from 'react-redux';
import { fetchAllPosts } from '../Slices/postsSlice';
// import { FilterCriteria } from '../Slices/postsSlice';
import './sideBar.css';
import { AppDispatch } from '../utils/store';
import { ChannelType } from '../utils/types';
import { CategoryType } from '../utils/types';

// We assume these types are correct based on your previous code.
// You should adjust these types based on actual channel and category types you have.
type Channel = string;
type Category = string;

interface SideBarProps {
  setSelectedChannels: React.Dispatch<React.SetStateAction<ChannelType[]>>;
  setSelectedCategories: React.Dispatch<React.SetStateAction<CategoryType[]>>;
}

const SideBar: React.FC<SideBarProps> = () => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const dispatch = useDispatch<AppDispatch>();


  const applyFilters = (channels: string[], categories: string[]) => {
    // Update the state with the selected channels and categories
    setSelectedChannels(channels);
    setSelectedCategories(categories);
  
    // Dispatch the fetchAllPosts action with the filters
    dispatch(fetchAllPosts({ filters: { channels, categories } }));
  };
  

  return (
    <div className='side-bar'>
      <IconButton onClick={() => navigate('/notifications')}>
        <NotificationsIcon />
      </IconButton>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => navigate('/feedback')}
      >
        Feedback
      </Button>
      <Button variant="contained" onClick={() => setModalOpen(true)}>
        Select Filters
      </Button>
      <FilterDisplay
        selectedChannels={selectedChannels}
        selectedCategories={selectedCategories}
      />
      <CheckBoxModal
        open={modalOpen}
        handleClose={() => setModalOpen(false)}
        applyFilters={applyFilters}
      />
    </div>
  );
};

export default SideBar;




