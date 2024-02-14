// ThemeToggle.tsx
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../actions/themeActions";
import Switch from "@mui/material/Switch";
import Fab from "@mui/material/Fab";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { RootState } from "../utils/store";
import { LightMode } from "@mui/icons-material";

export const ThemeToggle: React.FC = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleToggleClick = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  // ThemeToggle.tsx
  const handleThemeChange = () => {
    const newIsDarkMode = !isDarkMode; // Determine the new theme value
    dispatch(toggleTheme());
  
    // Update the body's data-theme attribute
    document.body.setAttribute("data-theme", newIsDarkMode ? "dark" : "light");
  
    // Save the theme preference to localStorage
    localStorage.setItem('theme', newIsDarkMode ? 'dark' : 'light');
  
    setIsDrawerOpen(false);
  };

  const drawerColor = isDarkMode ? 'var(--drawer-color-dark)' : 'var(--drawer-color-light)';


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
        color='info'
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
            fontSize: { xs: "1.55rem", sm: "2rem" }, // smaller icon on xs screens
          },
        }}
      >
        {isDarkMode ? <DarkModeIcon /> : <LightMode />}
      </Fab>

      {isDrawerOpen && (
        <div
          style={{
            backgroundColor: drawerColor,
            position: "fixed",
            bottom: "1rem",
            right: "4rem",
            // background: "#fff",
            padding: "1rem",
            borderRadius: "0.25rem",
            display: isDrawerOpen ? "block" : "none", // toggles display based on state
          }}
        >
          <Switch
            checked={isDarkMode}
            onChange={handleThemeChange}
          />
        </div>
      )}
    </div>
  );
};
