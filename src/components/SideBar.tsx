import React from 'react';
import { Button, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChannelSelector, { ChannelType } from './ChannelSelector';
import CategorySelector, { CategoryType } from './CategorySelector';
import './sideBar.css';

interface SideBarProps {
  setSelectedChannel: React.Dispatch<React.SetStateAction<ChannelType | undefined>>;
  setSelectedCategory: React.Dispatch<React.SetStateAction<CategoryType | undefined>>;
}

const SideBar: React.FC<SideBarProps> = ({ setSelectedChannel, setSelectedCategory }) => {
  const navigate = useNavigate();

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
      <ChannelSelector onChannelChange={setSelectedChannel} />
      <CategorySelector onCategoryChange={setSelectedCategory} />
      {/* Add your city and state selectors similarly here */}
    </div>
  );
};

export default SideBar;



