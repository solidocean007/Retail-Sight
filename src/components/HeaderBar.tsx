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

  const handleMenuOptionSelect = (option: string) => {
    setShowMenuTab(false); // Close the menu
    if (option === "createPost") {
      handleCreatePostClick();
    } else if (option === "filters") {
      toggleFilterMenu();
    }
  };

  return (
    <div className="header-bar">
      <div className="website-title">
        <h1>Displaygram</h1>
        <h4>instant retail</h4>
      </div>
      <div className="user-bar">
        <div className="user-button">
          <button
            className="profile-btn"
            // variant="contained"
            color="primary"
            onClick={currentUser ? openProfile : goToSignUpLogin}
          >
            <h3>
              {currentUser ? (
                <>
                  <i className="fa-solid fa-user"></i>
                  {` ${currentUser.firstName} ${currentUser.lastName}`}
                </>
              ) : (
                "Sign-up / Login"
              )}
            </h3>
          </button>
        </div>
      </div>

      <div className="menu-buttons">
        <button
          className="create-post-btn button"
          onClick={handleCreatePostClick}
        >
          <h3>CAPTURE</h3>
        </button>

        {/* <button
        className="about-button"
        >
        About
        </button> */}

        <button
          className="filter-menu-button"
          onClick={toggleFilterMenu}
        >
          <h3>Filters</h3>
        </button>
      </div>
      <div
        className="hamburger-menu-button"
        onClick={() => setShowMenuTab(!showMenuTab)}
      >
        ☰
      </div>
      {showMenuTab && (
        <MenuTab onOptionSelect={handleMenuOptionSelect} show={showMenuTab} />
      )}
    </div>
  );
};

export default HeaderBar;