//SideBar.tsx
import { Button, Select, MenuItem } from "@mui/material";
import { useNavigate } from "react-router-dom";
import LogOutButton from "./LogOutButton";

const SideBar = ({openProfile}) => {
  const navigate = useNavigate();

  return (
    <div>
      <Button className="profile-btn" variant="contained" color="secondary" onClick={openProfile}>
        Profile
      </Button>
      <Button
        className="create-post-btn"
        variant="contained"
        color="primary"
        onClick={() => navigate("/createPost")}
      >
        Create Post
      </Button>
      <LogOutButton />

      <Select
        displayEmpty
        className="dropdown"
        value=""
        placeholder="Select Option 1"
      >
        {/* Populate with real options */}
        <MenuItem value="">Option 1</MenuItem>
        {/* More options */}
      </Select>

      <Select
        displayEmpty
        className="dropdown"
        value=""
        placeholder="Select Option 2"
      >
        {/* Populate with real options */}
        <MenuItem value="">Option 2</MenuItem>
        {/* More options */}
      </Select>

      <Select
        displayEmpty
        className="dropdown"
        value=""
        placeholder="Select Option 3"
      >
        {/* Populate with real options */}
        <MenuItem value="">Option 3</MenuItem>
        {/* More options */}
      </Select>
    </div>
  );
};

export default SideBar;
