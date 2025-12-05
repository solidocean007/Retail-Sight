// front-end/src/components/ThemeToggle.tsx
import React, { useMemo, useState } from "react";
import "./themeToggle.css";
import { useDispatch, useSelector } from "react-redux";
import Switch from "@mui/material/Switch";
import Fab from "@mui/material/Fab";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { LightMode } from "@mui/icons-material";
import { RootState } from "../utils/store";
import { toggleTheme } from "../Slices/themeSlice";

export const ThemeToggle: React.FC = () => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleToggleClick = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const handleThemeChange = () => {
    dispatch(toggleTheme());
    setIsDrawerOpen(false);
  };

  // 🧠 UseMemo to re-read CSS variable after render based on isDarkMode
  const drawerColor = useMemo(() => {
    return getComputedStyle(document.body)
      .getPropertyValue("--drawer-background")
      .trim();
  }, [isDarkMode]);

  const switchColor = useMemo(() => {
    return getComputedStyle(document.body)
      .getPropertyValue("--switch-color")
      .trim();
  }, [isDarkMode]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "2rem",
        right: "1.5rem",
        zIndex: 5001,
      }}
    >
      <Fab
        color="info"
        aria-label="settings"
        onClick={handleToggleClick}
        sx={{
          position: "fixed",
          bottom: { xs: "1rem", sm: "2rem" },
          right: { xs: "1rem", sm: "1.5rem" },
          zIndex: 20,
          width: { xs: "40px", sm: "56px" },
          height: { xs: "40px", sm: "56px" },
          "& .MuiSvgIcon-root": {
            fontSize: { xs: "1.55rem", sm: "2rem" },
          },
        }}
      >
        {isDarkMode ? <DarkModeIcon /> : <LightMode />}
      </Fab>

      {isDrawerOpen && (
        <div
          className={`theme-toggle-drawer ${fadeOut ? "fade-out" : ""}`}
          style={{
            backgroundColor: drawerColor,
            position: "fixed",
            bottom: "1rem",
            right: "4rem",
            padding: "1rem",
            borderRadius: "0.25rem",
          }}
        >
          <Switch
            checked={isDarkMode}
            onChange={() => {
              setFadeOut(true);
              setTimeout(() => {
                handleThemeChange();
                setFadeOut(false);
              }, 400); // matches fade-out duration
            }}
            sx={{
              "& .MuiSwitch-switchBase": {
                color: switchColor,
              },
              "& .MuiSwitch-track": {
                backgroundColor: switchColor,
              },
              "& .MuiSwitch-switchBase.Mui-checked": {
                color: switchColor,
              },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: switchColor,
              },
            }}
          />
        </div>
      )}
    </div>
  );
};
