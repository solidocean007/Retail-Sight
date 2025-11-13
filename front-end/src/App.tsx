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
import { useAppBootstrap } from "./hooks/useAppBootstrap";

import AppLoadingScreen from "./components/AppLoadingScreen";
import { AppRoutes } from "./utils/Routes";
import UserModal from "./components/UserModal";


function App(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { currentUser, initializing } = useFirebaseAuth();
  const isDarkMode = useSelector((s: RootState) => s.theme.isDarkMode);
  const snackbar = useSelector((s: RootState) => s.snackbar);
  const appReady = useSelector((s: RootState) => s.app.appReady);
  const loadingMessage = useSelector((s: RootState) => s.app.loadingMessage);

  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  //
  // 🔄 Run core bootstrap (Option B)
  //
  useAppBootstrap();

  //
  // 🎨 Theme initialization
  //
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      dispatch(setDarkMode(storedTheme === "dark"));
    }
  }, [dispatch]);

  useEffect(() => {
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);


  //
  // 🧠 LOADER LOGIC — Option B
  //
  // - Public visitor → show full app immediately
  // - Logged-in user → show loader until essential boot completes
  // - Firebase still waking → show loader
  //
  const showLoader = (() => {
    if (initializing) return true;      // Firebase waking up
    if (!currentUser) return false;     // Public visitor → no blocking
    return !appReady;                   // Logged-in user waits for bootstrap
  })();


  return (
    <>
      {showLoader && (
        <AppLoadingScreen message={loadingMessage ?? "Loading…"} />
      )}

      {!showLoader && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ThemeToggle />

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

            {currentUser && <UserModal />}
          </ThemeProvider>
        </LocalizationProvider>
      )}
    </>
  );
}

export default App;
