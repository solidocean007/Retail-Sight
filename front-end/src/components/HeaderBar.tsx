import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { useNavigate } from "react-router-dom";
import useProtectedAction from "../utils/useProtectedAction";
import "./headerBar.css";
import MenuTab from "./MenuTab";
import { useEffect, useRef, useState } from "react";
import { showMessage } from "../Slices/snackbarSlice";
import { useOutsideAlerter } from "../utils/useOutsideAlerter";

const HeaderBar = ({ toggleFilterMenu }: { toggleFilterMenu: () => void }) => {
  const { currentUser } = useSelector((state: RootState) => state.user); // Simplified extraction
  const [showMenuTab, setShowMenuTab] = useState(false);
  // const [showAbout, setShowAbout] = useState(false);
  const navigate = useNavigate();
  const protectedAction = useProtectedAction();
  const menuRef = useRef<HTMLDivElement | null>(null); // Reference to MenuTab

  useOutsideAlerter(menuRef, () => setShowMenuTab(false));

  useEffect(() => {
    const headerBg = getComputedStyle(document.documentElement)
      .getPropertyValue("--header-background")
      .trim();

    console.log("💡 Header background from CSS:", headerBg);
  }, []);

  const goToSignUpLogin = () => {
    navigate("/sign-up-login");
  };

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
      if (currentUser?.role != "developer") {
        navigate("/dashboard");
      } else if (currentUser?.role == "developer") {
        navigate("/developer-dashboard");
      } else {
        showMessage("Not Logged in.");
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
    <>
      <div className="header-bar">
        <div className="website-title" onClick={() => navigate("/")}>
          <h1>Displaygram</h1>
          <h5>{currentUser?.company}</h5>

          {/* <p>version 0.2.4</p> */}
        </div>

        {!currentUser ? (
          <button onClick={goToSignUpLogin}>Login</button>
        ) : (
          <div className="header-details">
            <div className="header-buttons">
              {/* <div className="menu-buttons">
            <button onClick={handleCollectionsClick}>Collections</button>
          </div> */}
              <div className="menu-buttons">
                <button onClick={handleDashboardClick}>Dashboard</button>
              </div>
              <div className="capture-display-btn">
                <button onClick={handleCreatePostClick}>Create Display</button>
              </div>
            </div>

            <div
              className="hamburger-menu-button"
              onClick={() => setShowMenuTab(!showMenuTab)}
              aria-haspopup="true"
              aria-expanded={showMenuTab}
              style={{ visibility: showMenuTab ? "hidden" : "visible" }}
            >
              ☰
            </div>
          </div>
        )}
      </div>
      {showMenuTab && (
        <div ref={menuRef}>
          <MenuTab onOptionSelect={handleMenuOptionSelect} show={showMenuTab} />
        </div>
      )}
    </>
  );
};

export default HeaderBar;
