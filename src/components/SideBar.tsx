import { Button, Select, MenuItem, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";
import NotificationsIcon from '@mui/icons-material/Notifications';

// const SideBar = ({ openProfile } : { openProfile: () => void }) => {
const SideBar = () => {
  const navigate = useNavigate();

  return (
    <div>
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

      <Select 
        multiple
        displayEmpty
        className="dropdown"
        value={[]}
        placeholder="Filter by Channel"
      >
        {/* Populate with real channel options */}
        <MenuItem value="channel1">Channel 1</MenuItem>
        {/* More channel options */}
      </Select>

      <Select
        multiple
        displayEmpty
        className="dropdown"
        value={[]}
        placeholder="Filter by Category"
      >
        {/* Populate with real category options */}
        <MenuItem value="category1">Category 1</MenuItem>
        {/* More category options */}
      </Select>
    </div>
  );
};

export default SideBar;

