import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { useNavigate } from "react-router-dom";
import useProtectedAction from "../utils/useProtectedAction";
import "./headerBar.css";
import MenuTab from "./MenuTab";
import { useState } from "react";

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
      navigate("/dashboard");
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
        <p>version 0.1.3</p>
      </div>

      <div className="header-details">
        <button
          className="profile-btn"
          // variant="contained"
          color="primary"
          onClick={currentUser ? openProfile : goToSignUpLogin}
        >
          <h2>
            {currentUser ? (
              <>
                <i className="fa-solid fa-user"></i>
                {` ${currentUser.firstName} ${currentUser.lastName}`}
              </>
            ) : (
              "Sign-up / Login"
            )}
          </h2>
        </button>
        <div className="capture-display-btn">
          <button onClick={handleCreatePostClick}>Capture Display</button>
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