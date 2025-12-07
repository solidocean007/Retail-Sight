import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../utils/store";
import { useNavigate } from "react-router-dom";
import useProtectedAction from "../utils/useProtectedAction";
import "./headerBar.css";
import React, { useEffect, useRef, useState } from "react";
import { showMessage } from "../Slices/snackbarSlice";
import { useOutsideAlerter } from "../utils/useOutsideAlerter";
import { Badge, IconButton, Tooltip, useMediaQuery } from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import {
  selectNotifications,
  selectUnreadNotifications,
} from "../Slices/notificationsSlice";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationDropdown from "./Notifications/NotificationDropdown";

type HeaderBarProps = {
  toggleFilterMenu: () => void;
  openPostViewer?: (postId: string) => void;
  onRequestReset?: () => void; // ✅ new
};

const HeaderBar: React.FC<HeaderBarProps> = ({
  toggleFilterMenu,
  openPostViewer,
  onRequestReset,
}) => {
  const dispatch = useAppDispatch();
  const { localVersion, serverVersion, resetting } = useSelector(
    (s: RootState) => s.app
  );
  const upToDate = !!serverVersion && localVersion === serverVersion;
  const mobile = useMediaQuery("(max-width: 900px)");
  const notifications = useSelector(selectNotifications);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);
  const { currentUser } = useSelector((state: RootState) => state.user);
  const [showMenuTab, setShowMenuTab] = useState(false);
  const unreadNotifications = useSelector(selectUnreadNotifications);
  const unreadCount = unreadNotifications.length;
  const navigate = useNavigate();
  const protectedAction = useProtectedAction();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMobileLogo, setIsMobileLogo] = useState(false);

  /* --------------------------------------
     Detect small screens for logo swap
  --------------------------------------- */
  useEffect(() => {
    const check = () => setIsMobileLogo(window.innerWidth <= 520);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useOutsideAlerter(menuRef, () => setShowMenuTab(false));

  const goToSignUpLogin = () => navigate("/sign-up-login"); // i ll need to think about where this should take someone?  this page or signup? or login?
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

  const handleNotificationViewer = () => {
    if (notifications.length === 0) {
      dispatch(showMessage("No notifications right now."));
      return;
    }
    if (window.innerWidth < 768) {
      navigate("/notifications"); // 👈 Full-page for mobile
    } else {
      setShowNotificationDropdown(true); // 👈 Coming up next
    }
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

  return (
    <>
      <div className="header-bar">
        <div className="website-title" onClick={() => navigate("/")}>
          <div className="title-and-version">
            <img
              src={
                isMobileLogo
                  ? "/logos/displaygram-logo.svg"
                  : "/displaygram-logo-long-BLUE.png"
              }
              alt="Displaygram"
              className="header-brand-logo"
            />

            {!mobile && (
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
            )}
          </div>
          <div className="company-name-app-state">
            <h5>{currentUser?.company}</h5>
            {!upToDate ? (
              <button
                className="btn-outline danger-button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation(); // ✅ prevent splash navigation
                  onRequestReset?.(); // ✅ open modal in parent
                }}
                disabled={resetting}
              >
                {resetting ? "Resetting..." : "Reset App"}
              </button>
            ) : (
              <p className="up-to-date-message">✅ App is up to date</p>
            )}
          </div>
        </div>

        {!currentUser ? (
          <button onClick={goToSignUpLogin}>Login</button>
        ) : (
          <div className="header-details">
            <div className="header-buttons">
              <div className="menu-buttons">
                <button
                  className="btn-secondary"
                  onClick={handleDashboardClick}
                  // >{`${currentUser.role} Dashboard`}</button>
                >{`Dashboard`}</button>
              </div>
              <div className="capture-display-btn">
                <button
                  className="button-primary"
                  onClick={handleCreatePostClick}
                >
                  Create
                </button>
              </div>
            </div>
            <div
              className="hamburger-menu-button"
              onClick={handleDashboardClick}
              aria-haspopup="true"
              aria-expanded={showMenuTab} // Elements must only use supported ARIA attributes: ARIA attribute is not allowed: aria-expanded="{expression}"
              // style={{ visibility: showMenuTab ? "hidden" : "visible" }}
            >
              ☰
            </div>
            <div className="notification-box">
              <IconButton
                onClick={handleNotificationViewer}
                sx={mobile ? { padding: "4px" } : {}}
              >
                <Badge badgeContent={unreadCount} color="secondary">
                  <NotificationsIcon />
                </Badge>
              </IconButton>

              {showNotificationDropdown && (
                <div style={{ position: "relative" }}>
                  <NotificationDropdown
                    onClose={() => setShowNotificationDropdown(false)}
                    openPostViewer={openPostViewer}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HeaderBar;
