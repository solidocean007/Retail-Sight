// App.tsx
import React, { useEffect, useMemo } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { useSelector } from "react-redux";
import Snackbar from "@mui/material/Snackbar";
import { Alert, CssBaseline, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import "./App.css";
import { RootState, useAppDispatch } from "./utils/store";
import { hideMessage, nextMessage } from "./Slices/snackbarSlice";
import { setDarkMode } from "./Slices/themeSlice";
import { getTheme } from "./theme";
import { ThemeToggle } from "./components/ThemeToggle";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";
import AppLoadingScreen from "./components/AppLoadingScreen";
import { AppRoutes } from "./utils/Routes";
import UserModal from "./components/UserModal";
import { useAppBootstrap } from "./hooks/useAppBootstrap";

function App(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { currentUser, initializing } = useFirebaseAuth();
  const isDarkMode = useSelector((s: RootState) => s.theme.isDarkMode);
  const snackbar = useSelector((s: RootState) => s.snackbar);
  const appReady = useSelector((s: RootState) => s.app.appReady);
  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  // ---- 1. Run single atomic bootstrap ----
  useAppBootstrap();

  // ---- 2. Apply theme on first mount ----
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) dispatch(setDarkMode(storedTheme === "dark"));
  }, [dispatch]);

  useEffect(() => {
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // ---- 4. Main App Render ----
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ThemeToggle />
        {initializing || !appReady ? (
          <AppLoadingScreen />
        ) : (
          <>
            <Router>
              <AppRoutes />
            </Router>
            {snackbar.current && (
              <Snackbar
                open={snackbar.open}
                onClose={() => {
                  dispatch(hideMessage());
                  setTimeout(() => dispatch(nextMessage()), 500);
                }}
                autoHideDuration={snackbar.current.duration ?? 5000}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
              >
                <Alert
                  severity={snackbar.current.severity || "info"}
                  sx={{ width: "100%" }}
                  onClose={() => dispatch(hideMessage())}
                >
                  {snackbar.current.text}
                </Alert>
              </Snackbar>
            )}
            {!initializing && currentUser && <UserModal />}
          </>
        )}
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
