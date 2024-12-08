import React from "react";
import { handleLogout } from "../utils/validation/authenticate";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../utils/store";
import { clearUserData } from "../Slices/userSlice";
import { clearCollections } from "../Slices/collectionSlice";
import { clearLocationFilters, clearLocations } from "../Slices/locationSlice";
import { clearMissions } from "../Slices/missionsSlice";
import { clearPostsData } from "../Slices/postsSlice";
import { closeAndDeleteIndexedDB } from "../utils/database/indexedDBUtils";
import { clearTeams } from "../Slices/teamsSlice";
import { clearUserModal } from "../Slices/userModalSlice";
import { Button } from "@mui/material";

const LogOutButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onLogoutClick = async () => {
    try {
      console.log("Logout initiated");

      // Perform additional logout operations
      await handleLogout();  // Clear auth state here first

      // Clear IndexedDB
      console.log("Attempting to delete IndexedDB...");
      const deletePromise = closeAndDeleteIndexedDB();

      // Timeout in case the IndexedDB deletion hangs
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.warn("Forcing logout after timeout.");
          resolve();
        }, 5000); // 5-second timeout
      });

      await Promise.race([deletePromise, timeoutPromise]); // Race between actual deletion and timeout

      // Unregister any active service workers
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          console.log("Unregistering service worker: ", registration);
          registration.unregister();
        });
      });

      // Clear localStorage and Redux state
      console.log("Clearing localStorage and Redux state...");
      localStorage.clear();
      dispatch(clearUserData());
      dispatch(clearCollections());
      dispatch(clearLocationFilters());
      dispatch(clearLocations());
      dispatch(clearMissions());
      dispatch(clearPostsData());
      dispatch(clearTeams());
      dispatch(clearUserModal());

      // Navigate to home page after logout process completes
      console.log("Navigating to home page...");
      navigate("/"); // Do not navigate before everything is cleared
    } catch (error) {
      console.error("There was an error during logout", error);
    }
  };

  return (
    <Button className="log-out-btn" onClick={onLogoutClick}>
      Log Out
    </Button>
  );
};

export default LogOutButton;