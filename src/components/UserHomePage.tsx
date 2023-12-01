// userHomePage.tsx
import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { Container, AppBar, Toolbar } from "@mui/material";
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
  console.log(currentUser, " : currentUser");

  useEffect(() => {
    // Dispatch the action to fetch location options
    dispatch(fetchLocationOptions());
  }, [dispatch]);

  const openProfile = () => navigate("/profile-page");

  return (
    <div className="container-user-home-page">
      <AppBar position="fixed" style={{ backgroundColor: "#333" }}>
        <Toolbar className="tool-bar">
          <div>
            <h3>
              Welcome, {currentUser?.firstName} {currentUser?.lastName}{" "}
              {/*Here is the line that loses the users data on page refresh*/}
            </h3>
          </div>
          <div className="menu-buttons">
            <Button
              className="profile-btn"
              variant="contained"
              color="primary"
              onClick={openProfile}
            >
              Profile
            </Button>
            <Button
              className="create-post-btn"
              variant="contained"
              color="secondary"
              onClick={() => navigate("/createPost")}
            >
              Create Post
            </Button>
            {/* <LogOutButton /> */}
          </div>
        </Toolbar>
      </AppBar>
      <div className="home-page-content">
        <div className="activity-feed-container">
          <ActivityFeed />
        </div>
        <div className="side-bar-container">
          <SideBar />
        </div>
      </div>
    </div>
  );
};

{
  /* <CheckBoxModal

/> */
}
