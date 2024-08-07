// LogOutButton.tsx
import React from "react";
import { handleLogout } from "../utils/validation/authenticate";
import { useNavigate } from "react-router-dom";

const LogOutButton: React.FC = () => {
  const navigate = useNavigate();

  const onLogoutClick = async () => {
    try {
      await handleLogout();
      navigate("/");
    } catch (error) {
      console.error("There was an error logging out", error);
    }
  };

  return (
    <button className="log-out-btn" onClick={onLogoutClick}>
      Log Out
    </button>
  );
};

export default LogOutButton;
