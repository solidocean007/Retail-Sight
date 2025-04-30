import { useSelector } from "react-redux";
import { RootState } from "../utils/store";
import { useNavigate } from "react-router-dom";
import useProtectedAction from "../utils/useProtectedAction";
import "./headerBar.css";
import MenuTab from "./MenuTab";
import { useEffect, useRef, useState } from "react";
import { showMessage } from "../Slices/snackbarSlice";
import { useOutsideAlerter } from "../utils/useOutsideAlerter";
import { openDB } from "../utils/database/indexedDBOpen";

const HeaderBar = ({ toggleFilterMenu }: { toggleFilterMenu: () => void }) => {
  const { currentUser } = useSelector((state: RootState) => state.user); // Simplified extraction
  const [showMenuTab, setShowMenuTab] = useState(false);
  const [localVersion, setLocalVersion] = useState<string | null>(null);

  const navigate = useNavigate();
  const protectedAction = useProtectedAction();
  const menuRef = useRef<HTMLDivElement | null>(null); // Reference to MenuTab

  useOutsideAlerter(menuRef, () => setShowMenuTab(false));

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

  useEffect(() => {
    const getLocalSchemaVersion = async () => {
      try {
        const db = await openDB();
        const transaction = db.transaction("localSchemaVersion", "readonly");
        const store = transaction.objectStore("localSchemaVersion");
        const request = store.get("schemaVersion");

        request.onsuccess = () => {
          const result = request.result;
          if (result?.version) {
            setLocalVersion(result.version);
          }
        };

        request.onerror = () => {
          console.error("Failed to load schema version:", request.error);
        };
      } catch (err) {
        console.error("Error opening IndexedDB:", err);
      }
    };

    getLocalSchemaVersion();
  }, []);

  return (
    <>
      <div className="header-bar">
        <div className="website-title" onClick={() => navigate("/")}>
          <div className="title-and-version">
            <h1>Displaygram</h1>
            {localVersion ? (
              <p className="version-number">{localVersion}</p>
            ) : (
              <p className="version-number">loading…</p>
            )}
          </div>
          <h5>{currentUser?.company}</h5>
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
