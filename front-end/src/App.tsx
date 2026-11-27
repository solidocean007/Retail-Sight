// App.tsx
import React, { useEffect, useMemo } from "react";
import {
  BrowserRouter as Router,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useSelector } from "react-redux";

import Snackbar from "@mui/material/Snackbar";
import { Alert, CssBaseline, ThemeProvider } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { httpsCallable } from "firebase/functions";

import "./App.css";

import { RootState, useAppDispatch } from "./utils/store";
import { hideMessage, nextMessage, showMessage } from "./Slices/snackbarSlice";
import {
  subscribeToForegroundMessages,
  type PushPayload,
} from "./firebase/foregroundMessages";
import {
  getCurrentDevicePushPermission,
  isNativeAndroidPush,
  registerCurrentDeviceForPush,
  subscribeToNativeAndroidPush,
} from "./firebase/pushRegistration";
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

import { displaygramEnvironment, functions } from "./utils/firebase";
import { handleLogout } from "./utils/validation/authenticate";
import { stopViewAsCompany } from "./Slices/impersonationSlice";
import { OfflineCaptureStatusBanner } from "./features/offlineCapture/OfflineCaptureStatusBanner";

function AppContent() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentUser,
    initializing,
    profileError,
    profileErrorDetail,
    usingCachedProfile,
    retryProfileLoad,
  } = useFirebaseAuth();
  const user = useSelector((state: RootState) => state.user.currentUser);
  const isDarkMode = useSelector((s: RootState) => s.theme.isDarkMode);
  const snackbar = useSelector((s: RootState) => s.snackbar);
  const appReady = useSelector((s: RootState) => s.app.appReady);
  const loadingMessage = useSelector((s: RootState) => s.app.loadingMessage);
  const isImpersonating = useSelector(
    (state: RootState) => state.impersonation.active,
  );

  const impersonatedCompanyId = useSelector(
    (state: RootState) => state.impersonation.companyId,
  );

  const theme = useMemo(() => getTheme(isDarkMode), [isDarkMode]);
  const trackPushClick = useMemo(
    () =>
      httpsCallable<
        { notificationId: string; source: "push" },
        { success: boolean }
      >(functions, "trackNotificationClickCallable"),
    [],
  );

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
        "/android-beta",
      ]),
    [],
  );

  const AUTH_ROUTES = useMemo(
    () =>
      new Set([
        "/login",
        "/sign-up-login",
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
    pathname.startsWith("/onboard-company") ||
    pathname.startsWith("/new-company-invite");

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isStandalonePostRoute =
    pathname.startsWith("/post/") || pathname.startsWith("/p/");
  const isCreatePostRoute = pathname === "/create-post";

  const shouldBootstrapApp = !isPublicRoute && !isAuthRoute && !!currentUser;

  useEffect(() => {
    if (
      !user?.uid ||
      !user.companyId ||
      usingCachedProfile ||
      isPublicRoute ||
      isAuthRoute
    )
      return;
    let cancelled = false;
    let stopSync: (() => void) | undefined;

    void import("./features/offlineCapture/offlineCaptureSync")
      .then(({ startOfflineCaptureSync }) => {
        if (cancelled) return;
        stopSync = startOfflineCaptureSync(user.uid, user.companyId);
      })
      .catch((error) =>
        console.warn("Offline capture sync could not be loaded:", error),
      );

    return () => {
      cancelled = true;
      stopSync?.();
    };
  }, [
    user?.uid,
    user?.companyId,
    usingCachedProfile,
    isPublicRoute,
    isAuthRoute,
  ]);

  useAppBootstrap({
    enabled: shouldBootstrapApp,
    currentUser,
    initializing,
    usingCachedProfile,
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

  // Keep this device''s FCM token fresh + registered under the
  // CURRENT account. Runs only when permission was already granted
  // (never prompts). Fixes: stale tokens after FCM rotation, and
  // tokens not following the user across account switches.
  useEffect(() => {
    if (!currentUser?.uid) return;

    let cancelled = false;

    void getCurrentDevicePushPermission()
      .then((permission) => {
        if (permission !== "granted") return;
        if (cancelled) return;
        registerCurrentDeviceForPush().catch((err) =>
          console.warn("Silent FCM re-register failed:", err),
        );
      })
      .catch((error) =>
        console.warn("Firebase Messaging could not be loaded:", error),
      );

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  // Foreground push messages received while the app is open fire here
  // (the web service worker only handles background browser pushes).
  useEffect(() => {
    if (!currentUser?.uid) return;

    const showForegroundPush = (payload: PushPayload) => {
      const d = payload?.data || {};
      const title = payload?.notification?.title || d.title || "";
      const body = payload?.notification?.body || d.body || "";
      const text = [title, body].filter(Boolean).join(" — ");

      if (text) dispatch(showMessage(text));
    };

    if (isNativeAndroidPush()) {
      let unsubscribe = () => {};
      let disposed = false;

      void subscribeToNativeAndroidPush({
        onReceived: showForegroundPush,
        onAction: ({ data }) => {
          const notificationId =
            typeof data.notificationId === "string"
              ? data.notificationId
              : "";

          if (notificationId) {
            void trackPushClick({
              notificationId,
              source: "push",
            }).catch((error) =>
              console.error("Notification analytics update failed:", error),
            );
          }

          const requestedLink =
            typeof data.link === "string" ? data.link : "/notifications";
          navigate(
            requestedLink.startsWith("/")
              ? requestedLink
              : "/notifications",
          );
        },
      })
        .then((cleanup) => {
          if (disposed) {
            cleanup();
            return;
          }
          unsubscribe = cleanup;
        })
        .catch((error) =>
          console.error("Native push listeners could not be attached:", error),
        );

      return () => {
        disposed = true;
        unsubscribe();
      };
    }

    const unsubscribe = subscribeToForegroundMessages(
      showForegroundPush,
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid, dispatch, navigate, trackPushClick]);

  // Push notification click tracking
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!currentUser?.uid) return;

    const handler = async (event: MessageEvent) => {
      if (event.data?.type !== "NOTIFICATION_CLICK") return;

      const { notificationId } = event.data?.data || {};
      if (!notificationId) return;

      try {
        await trackPushClick({
          notificationId,
          source: "push",
        });
      } catch (error) {
        console.error("Notification analytics update failed:", error);
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [currentUser?.uid, trackPushClick]);

  const showAppLoader = shouldBootstrapApp && (initializing || !appReady);

  if (initializing && (pathname === "/" || pathname === "/splash")) {
    return <AppLoadingScreen show message="Restoring session…" />;
  }

  // IMPORTANT:
  // Do NOT mount routes/feed/UI while bootstrapping.
  if (showAppLoader) {
    return (
      <AppLoadingScreen
        show
        message={
          profileError
            ? "We couldn''t load your profile."
            : (loadingMessage ?? "Loading…")
        }
        errored={profileError}
        errorDetail={profileErrorDetail}
        onRetry={retryProfileLoad}
        onSignOut={handleLogout}
      />
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <CssBaseline />

        <div className="app-shell">
          {displaygramEnvironment !== "production" && (
            <div className="test-environment-banner" role="status">
              <span>
                Displaygram Test Environment — posts here are test data
              </span>
              <a href="/android-beta">Get Android beta</a>
            </div>
          )}
          {isImpersonating && (
            <div className="view-as-banner">
              👁 View-As Active: {impersonatedCompanyId}
              <button onClick={() => dispatch(stopViewAsCompany())}>
                Exit
              </button>
            </div>
          )}
          {user?.uid && !isPublicRoute && !isAuthRoute && (
            <OfflineCaptureStatusBanner userId={user.uid} />
          )}
          {!isPublicRoute && <ThemeToggle />}

          {/* Main layout frame */}
          <div className="page-layout-frame">
            <AppRoutes signedIn={!!currentUser} />
            {!isPublicRoute &&
              !isAuthRoute &&
              !isStandalonePostRoute &&
              !isCreatePostRoute && <Footer />}
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
