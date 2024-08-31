// LogOutButton.tsx
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

const LogOutButton: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const onLogoutClick = async () => {
    try {
      await closeAndDeleteIndexedDB();
      await handleLogout();
      localStorage.clear();
      dispatch(clearUserData());
      dispatch(clearCollections());
      dispatch(clearLocationFilters());
      dispatch(clearLocations());
      dispatch(clearMissions());
      dispatch(clearPostsData());
      dispatch(clearTeams());
      dispatch(clearUserModal());
      
      navigate("/");
    } catch (error) {
      console.error("There was an error logging out", error); // this logs
    }
  };

  return (
    <button className="log-out-btn" onClick={onLogoutClick}>
      Log Out
    </button>
  );
};

export default LogOutButton;
