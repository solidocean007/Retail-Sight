// ThemeToggle.tsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../actions/themeActions";
import Switch from "@mui/material/Switch";
import Fab from "@mui/material/Fab";
import SettingsIcon from "@mui/icons-material/Settings";
import { RootState } from "../utils/store";

export const ThemeToggle: React.FC = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleToggleClick = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  // ThemeToggle.tsx
  const handleThemeChange = () => {
    dispatch(toggleTheme());

    // Update the body's data-theme attribute
    if (isDarkMode) {
      document.body.setAttribute("data-theme", "light");
    } else {
      document.body.setAttribute("data-theme", "dark");
    }
    setIsDrawerOpen(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "1.5rem",
        zIndex: "20",
      }}
    >
      <Fab
        color="primary"
        aria-label="settings"
        onClick={handleToggleClick}
        sx={{
          position: "fixed",
          bottom: { xs: "1rem", sm: "2rem" }, // smaller on xs screens
          right: { xs: "1rem", sm: "1.5rem" }, // smaller on xs screens
          zIndex: "20",
          // You can also adjust the size if needed:
          width: { xs: "40px", sm: "56px" }, // example sizes
          height: { xs: "40px", sm: "56px" }, // example sizes
          "& .MuiSvgIcon-root": {
            // targeting the icon inside the Fab
            fontSize: { xs: "1.25rem", sm: "1.75rem" }, // smaller icon on xs screens
          },
        }}
      >
        <SettingsIcon />
      </Fab>

      {isDrawerOpen && (
        <div 
          style={{
            backgroundColor: '{primary}', // this doesnt work
            position: "fixed",
            bottom: "1rem",
            right: "4rem",
            background: "#fff",
            padding: "1rem",
            borderRadius: "0.25rem",
            display: isDrawerOpen ? "block" : "none", // toggles display based on state
          }}
        >
          <Switch
            checked={isDarkMode}
            onChange={handleThemeChange}
            // color="primary"
            // sx={{
            //   width: { xs: "40px", sm: "60px" }, // adjust width as needed
            //   height: { xs: "20px", sm: "24px" }, // adjust height as needed
            //   "& .MuiSwitch-switchBase": {
            //     // targeting inner elements if needed
            //     // other style adjustments here
            //   },
            // }}
          />
        </div>
      )}
    </div>
  );
};
