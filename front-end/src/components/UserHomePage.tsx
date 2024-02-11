// userHomePage.tsx
import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";
// import { useSelector } from "react-redux";
import "./userHomePage.css";
// import { RootState } from "../utils/store";
import SideBar from "./SideBar";
import { AppDispatch } from "../utils/store";
// import { ChannelType } from "./ChannelSelector";
// import { CategoryType } from "./CategorySelector";
import { useDispatch } from "react-redux";
import { fetchLocationOptions } from "../Slices/locationSlice";
import HeaderBar from "./HeaderBar";
// import LeftSideBar from "./LeftSideBar";
import { UserHomePageHelmet } from "../utils/helmetConfigurations";
// import CheckBoxModal from "./CheckBoxModal";

export const UserHomePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const toggleFilterMenu = () => {
    setIsFilterMenuOpen(!isFilterMenuOpen);
  };

  useEffect(() => {
    // Dispatch the action to fetch location options
    console.log("fetching?");
    dispatch(fetchLocationOptions());
  }, [dispatch]);

  return (
    <>
      <UserHomePageHelmet />
      <div className="user-home-page-container">
        <div className="header-bar-container">
          <HeaderBar toggleFilterMenu={toggleFilterMenu} />
        </div>
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
    </>
  );
};
