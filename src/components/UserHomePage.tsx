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
import useProtectedAction from "../utils/useProtectedAction";
// import CheckBoxModal from "./CheckBoxModal";

export const UserHomePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { currentUser } = useSelector((state: RootState) => state.user); // Simplified extraction
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const protectedAction = useProtectedAction();

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
  const goToSignUpLogin = () => navigate("/sign-up-login");
  const handleCreatePostClick = () => {
    protectedAction(() => {
      navigate("/createPost");
    });
  };

  return (
    <div className="container-user-home-page">
      <AppBar className="app-bar" position="fixed" style={{ backgroundColor: "#333" }}>
      <div className="title">
          <h1>Displaygram</h1>
        </div>

        <Toolbar className="tool-bar">
        
          <div className="user-button">
            <button
              className="profile-btn"
              // variant="contained"
              color="primary"
              onClick={currentUser ? openProfile : goToSignUpLogin}
            >
              <h3>
                {currentUser
                  ? `Welcome, ${currentUser?.firstName} ${currentUser?.lastName} `
                  : `Sign-up Login `}
                {/*Here is the line that loses the users data on page refresh*/}
              </h3>
            </button>
          </div>
          <div className="menu-buttons">
            <button
              className="create-post-btn"
              // variant="contained"
              color="secondary"
              onClick={handleCreatePostClick}
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
