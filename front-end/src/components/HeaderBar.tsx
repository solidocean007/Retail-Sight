import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { useNavigate } from "react-router-dom";
import useProtectedAction from "../utils/useProtectedAction";
import "./headerBar.css";
import MenuTab from "./MenuTab";
import { useState } from "react";
import { showMessage } from "../Slices/snackbarSlice";

const HeaderBar = ({ toggleFilterMenu }: { toggleFilterMenu: () => void }) => {
  const { currentUser } = useSelector((state: RootState) => state.user); // Simplified extraction
  const [showMenuTab, setShowMenuTab] = useState(false);
  // const [showAbout, setShowAbout] = useState(false);
  const navigate = useNavigate();
  const protectedAction = useProtectedAction();

  const openProfile = () => navigate("/profile-page");
  const goToSignUpLogin = () => navigate("/sign-up-login");
  const handleCreatePostClick = () => {
    protectedAction(() => {
      navigate("/createPost");
    });
  };

  const handleTutorialClick = () => {
    protectedAction(() => {
      navigate("/tutorial");
    });
  };

  const handleDashboardClick = () => {
    protectedAction(() => {
      if(currentUser?.role != 'developer'){
        navigate("/dashboard");
      } else if (currentUser?.role == 'developer') {
        navigate('/developer-dashboard')
      } else {
        showMessage("Not Logged in.")
      }
    });
  };

  const handleMenuOptionSelect = (option: string) => {
    setShowMenuTab(false); // Close the menu
    if (option === "createPost") {
      handleCreatePostClick();
    } else if (option === "filters") {
      toggleFilterMenu();
    } else if (option === "tutorial") {
      handleTutorialClick();
    } else if (option === "dashboard") {
      handleDashboardClick();
    } 
  };

  return (
    <div className="header-bar">
      <div className="website-title">
        <h1>Displaygram</h1>
        <p>version 0.1.4</p>
      </div>

      <div className="header-details">
        <h3>{currentUser?.company}</h3>
        <div className="header-buttons">
          {/* <div className="menu-buttons">
            <button onClick={handleCollectionsClick}>Collections</button>
          </div> */}
          <div className="menu-buttons">
            <button onClick={handleDashboardClick}>Dashboard</button>
          </div>
          <div className="capture-display-btn">
            <button onClick={handleCreatePostClick}>Capture Display</button>
          </div>
        </div>

        <div
          className="hamburger-menu-button"
          onClick={() => setShowMenuTab(!showMenuTab)}
        >
          ☰
        </div>
      </div>

      {showMenuTab && (
        <MenuTab onOptionSelect={handleMenuOptionSelect} show={showMenuTab} />
      )}
    </div>
  );
};

export default HeaderBar;
