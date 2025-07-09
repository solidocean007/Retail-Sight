import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { useNavigate } from "react-router-dom";
import useProtectedAction from "../utils/useProtectedAction";
import "./headerBar.css";
import { useRef, useState } from "react";
import { showMessage } from "../Slices/snackbarSlice";
import { useOutsideAlerter } from "../utils/useOutsideAlerter";
import { Tooltip } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import { resetApp } from "../utils/resetApp";
import { useAppConfigSync } from "../hooks/useAppConfigSync";

const HeaderBar = ({ toggleFilterMenu }: { toggleFilterMenu: () => void }) => {
  const { localVersion, serverVersion } = useAppConfigSync();

  const dispatch = useAppDispatch();
  const { currentUser } = useSelector((state: RootState) => state.user);
  const [showMenuTab, setShowMenuTab] = useState(false);
  // const [localVersion, setLocalVersion] = useState<string | null>("Loading...");
  // const [serverVersion, setServerVersion] = useState<string | null>(null);
  const navigate = useNavigate();
  const protectedAction = useProtectedAction();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useOutsideAlerter(menuRef, () => setShowMenuTab(false));

  const goToSignUpLogin = () => navigate("/sign-up-login");
  const handleCreatePostClick = () =>
    protectedAction(() => navigate("/create-post"));
  const handleTutorialClick = () =>
    protectedAction(() => navigate("/tutorial"));
  const handleDashboardClick = () => {
    protectedAction(() => {
      if (currentUser?.role !== "developer") navigate("/dashboard");
      else if (currentUser?.role === "developer")
        navigate("/developer-dashboard");
      else showMessage("Not Logged in.");
    });
  };

  const handleMenuOptionSelect = (option: string) => {
    if (option === "filters") {
      toggleFilterMenu();
      setTimeout(() => setShowMenuTab(false), 200);
    } else {
      if (option === "createPost") handleCreatePostClick();
      else if (option === "tutorial") handleTutorialClick();
      else if (option === "dashboard") handleDashboardClick();
      setShowMenuTab(false);
    }
  };

  const handleReset = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the app? This will clear all stored data."
      )
    ) {
      await resetApp(dispatch);
    }
  };

  return (
    <>
      <div className="header-bar">
        <div className="website-title" onClick={() => navigate("/")}>
          <div className="title-and-version">
            <h1>Displaygram</h1>
            <div className="version-info">
              <Tooltip
                title={`Local version: ${localVersion}${
                  serverVersion ? ` | Latest: ${serverVersion}` : ""
                }`}
              >
                <span className="version-text">
                  v{localVersion}
                  <InfoIcon fontSize="small" style={{ marginLeft: "4px" }} />
                </span>
              </Tooltip>
            </div>
          </div>
          <h5>{currentUser?.company}</h5>
        </div>
        {currentUser?.role === "super-admin" && (
          <button className="btn-outline danger-button" onClick={handleReset}>
            Reset App
          </button>
        )}
         <button className="btn-outline danger-button" onClick={handleReset}>
            Reset App
          </button>
        {!currentUser ? (
          <button onClick={goToSignUpLogin}>Login</button>
        ) : (
          <div className="header-details">
            <div className="header-buttons">
              <div className="menu-buttons">
                <button onClick={handleDashboardClick}>Dashboard</button>
              </div>
              <div className="capture-display-btn">
                <button onClick={handleCreatePostClick}>Create Display</button>
              </div>
            </div>
            <div
              className="hamburger-menu-button"
               onClick={() => navigate("/dashboard")}

              aria-haspopup="true"
              aria-expanded={showMenuTab}
              // style={{ visibility: showMenuTab ? "hidden" : "visible" }}
            >
              ☰
            </div>
          </div>
        )}
      </div>
     
    </>
  );
};

export default HeaderBar;
