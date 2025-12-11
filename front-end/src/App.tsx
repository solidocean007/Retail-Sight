// App.tsx
import React, { useEffect, useMemo } from "react";
import { BrowserRouter as Router, useLocation } from "react-router-dom";
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
import ScrollToTop from "./ScrollToTop";
import Footer from "./components/Footer/Footer";
import { setAppReady } from "./Slices/appSlice";

function AppContent() {
  const dispatch = useAppDispatch();
  const { currentUser, initializing } = useFirebaseAuth();

  const isDarkMode = useSelector((s: RootState) => s.theme.isDarkMode);
  const snackbar = useSelector((s: RootState) => s.snackbar);
  const appReady = useSelector((s: RootState) => s.app.appReady);
  const loadingMessage = useSelector((s: RootState) => s.app.loadingMessage);

  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);
  const location = useLocation();
  const isSplashPage = location.pathname === "/";

  useAppBootstrap();

  // Theme initialization
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      dispatch(setDarkMode(storedTheme === "dark"));
    }
  }, [dispatch]);

  useEffect(() => {
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Only global-blocking conditions
  const showAppLoader = !isSplashPage && (initializing || !appReady);

  useEffect(() => {
    const timeout = setTimeout(() => {
      dispatch(setAppReady(true));
    }, 8000);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <>
      {/* Visual overlay only — never blocks mount */}
      <AppLoadingScreen
        show={showAppLoader}
        message={loadingMessage ?? "Loading…"}
      />

      <div className={`app-shell ${showAppLoader ? "app-shell-hidden" : ""}`}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <ThemeProvider theme={theme}>
            <CssBaseline />

            {!isSplashPage && <ThemeToggle />}

            {/* Main layout frame */}
            <div className="page-layout-frame">
              <AppRoutes />
              {!isSplashPage && <Footer />}
            </div>

            {/* Alerts */}
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
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="app-frame">
        <AppContent />
      </div>
    </Router>
  );
}
