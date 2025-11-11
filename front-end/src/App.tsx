// App.tsx
import Snackbar from "@mui/material/Snackbar";
import { useSelector } from "react-redux";
import { hideMessage, nextMessage } from "./Slices/snackbarSlice";
import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { RootState, useAppDispatch } from "./utils/store";
import { ThemeToggle } from "./components/ThemeToggle";
import { ThemeProvider, CssBaseline, Alert } from "@mui/material";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";
import { AppRoutes } from "./utils/Routes";
import { getTheme } from "./theme";
import React, { useEffect } from "react";
import { setDarkMode } from "./Slices/themeSlice"; // ✅ New, clean import
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import UserModal from "./components/UserModal";
import { useAppBootstrap } from "./hooks/useApppBootstrap";
import AppLoadingScreen from "./components/AppLoadingScreen";
// import { migrateCompanyNameUsers } from "./script";

function App(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const { currentUser, initializing } = useFirebaseAuth();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const snackbar = useSelector((state: RootState) => state.snackbar);
  const appReady = useSelector((s: RootState) => s.app.appReady);
  const theme = React.useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  // Single atomic bootstrap
  useAppBootstrap();

  // 🌓 Set theme on first load based on localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      dispatch(setDarkMode(storedTheme === "dark"));
    }
  }, [dispatch]);

  if (initializing || !appReady) {
    return <AppLoadingScreen />; // ✅ user sees clean loading state
  }

  return (
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

        {!initializing && currentUser && <UserModal />}
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
