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

import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./utils/firebase";

function AppContent() {
  const dispatch = useAppDispatch();
  const location = useLocation();

  const { currentUser, initializing } = useFirebaseAuth();

  const isDarkMode = useSelector((s: RootState) => s.theme.isDarkMode);
  const snackbar = useSelector((s: RootState) => s.snackbar);
  const appReady = useSelector((s: RootState) => s.app.appReady);
  const loadingMessage = useSelector((s: RootState) => s.app.loadingMessage);

  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  const PUBLIC_ROUTES = useMemo(
    () =>
      new Set([
        "/",
        "/pricing",
        "/features",
        "/splash",
        "/about",
        "/privacy-policy",
        "/terms-service",
        "/cookies",
        "/contact-us",
        "/help-support",
      ]),
    [],
  );

  const AUTH_ROUTES = useMemo(
    () =>
      new Set([
        "/login",
        "/signup",
        "/request-access",
        "/reset-password",
        "/request-submitted",
      ]),
    [],
  );

  const pathname = location.pathname;

  const isAuthRoute =
    AUTH_ROUTES.has(pathname) ||
    pathname.startsWith("/accept-invite") ||
    pathname.startsWith("/onboard-company");

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);

  const shouldBootstrapApp = !isPublicRoute && !isAuthRoute && !!currentUser;

  useAppBootstrap({
    enabled: shouldBootstrapApp,
    currentUser,
    initializing,
  });

  // Theme init from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");

    if (storedTheme) {
      dispatch(setDarkMode(storedTheme === "dark"));
    }
  }, [dispatch]);

  // Sync body theme attr
  useEffect(() => {
    document.body.setAttribute("data-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Push notification click tracking
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!currentUser?.uid) return;

    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== "NOTIFICATION_CLICK") return;

      const { notificationId } = event.data?.data || {};
      if (!notificationId) return;

      try {
        const ref = doc(
          db,
          "users",
          currentUser.uid,
          "notifications",
          notificationId,
        );

        await updateDoc(ref, {
          "analytics.clickedAt": serverTimestamp(),
          "analytics.clickedFrom": "push",
        });
      } catch (error) {
        console.error("Notification analytics update failed:", error);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [currentUser?.uid]);

  const showAppLoader = shouldBootstrapApp && (initializing || !appReady);

  // IMPORTANT:
  // Do NOT mount routes/feed/UI while bootstrapping.
  if (showAppLoader) {
    return <AppLoadingScreen show message={loadingMessage ?? "Loading…"} />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <div className="app-shell">
          {!isPublicRoute && <ThemeToggle />}

          <div className="page-layout-frame">
            <AppRoutes />
            {!isPublicRoute && <Footer />}
          </div>

          {snackbar.current && (
            <Snackbar
              open={snackbar.open}
              onClose={() => {
                dispatch(hideMessage());

                setTimeout(() => {
                  dispatch(nextMessage());
                }, 500);
              }}
              autoHideDuration={snackbar.current.duration ?? 5000}
              anchorOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
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
        </div>
      </ThemeProvider>
    </LocalizationProvider>
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
