// userHomePage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";

import { useSelector } from "react-redux";
import "./userHomePage.css";
import { RootState } from "../utils/store";
import SideBar from "./SideBar";
import { AppDispatch } from "../utils/store";
// import { ChannelType } from "./ChannelSelector";
// import { CategoryType } from "./CategorySelector";
import { useDispatch } from "react-redux";
import { fetchLocationOptions } from "../Slices/locationSlice";
// import CheckBoxModal from "./CheckBoxModal";

export const UserHomePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state: RootState) => state.user); // Simplified extraction
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

  const toggleFilterMenu = () => {
    setIsFilterMenuOpen(!isFilterMenuOpen);
  };

  useEffect(() => {
    console.log("UserHomePage mounts");
    return () => {
      console.log("UserHomePage unmounts");
    };
  }, []);

  useEffect(() => {
    // Dispatch the action to fetch location options
    dispatch(fetchLocationOptions());
  }, [dispatch]);

  const openProfile = () => navigate("/profile-page");

  return (
    <div className="container-user-home-page">
      <AppBar position="fixed" style={{ backgroundColor: "#333" }}>
        <Toolbar className="tool-bar">
          <div className="user-button">
            <button
              className="profile-btn"
              // variant="contained"
              color="primary"
              onClick={openProfile}
            >
              <h3>
                Welcome, {currentUser?.firstName} {currentUser?.lastName}{" "}
                {/*Here is the line that loses the users data on page refresh*/}
              </h3>
            </button>
          </div>
          <div className="menu-buttons">
            <button
              className="create-post-btn"
              // variant="contained"
              color="secondary"
              onClick={() => navigate("/createPost")}
            >
              <h3>Create Post</h3>
            </button>

            <button className="filter-menu-button" onClick={toggleFilterMenu}>
             <h3>Filters</h3>
            </button>
          </div>
        </Toolbar>
      </AppBar>
      <div className="home-page-content">
        <div className="activity-feed-container">
          <ActivityFeed />
        </div>
        <div
          className={`side-bar-container ${
            isFilterMenuOpen ? "sidebar-fullscreen" : ""
          }`}
        >
          <SideBar toggleFilterMenu={toggleFilterMenu} />
        </div>
      </div>
    </div>
  );
};
