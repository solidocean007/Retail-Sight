// App.tsx
import Snackbar from "@mui/material/Snackbar";
import { useSelector } from "react-redux";
import { hideMessage, nextMessage } from "./Slices/snackbarSlice";
import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { RootState, useAppDispatch } from "./utils/store";
import { ThemeToggle } from "./components/ThemeToggle";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";
import { AppRoutes } from "./utils/Routes";
import { getTheme } from "./theme";
import React, { useCallback, useEffect, useState } from "react";
import { setDarkMode } from "./Slices/themeSlice"; // ✅ New, clean import
import { setupCompanyGoalsListener } from "./utils/listeners/setupCompanyGoalsListener";
import { setupGalloGoalsListener } from "./utils/listeners/setupGalloGoalsListener";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { loadCompany } from "./thunks/companyConnectionThunk";
import { fetchCompanyProducts } from "./thunks/productThunks";
import { setAllProducts } from "./Slices/productsSlice";
import { getAllCompanyProductsFromIndexedDB } from "./utils/database/indexedDBUtils";
import useSchemaVersion from "./hooks/useSchemaVersion";
import useCompanyUsersSync from "./hooks/useCompanyUsersSync";
import useAllCompanyAccountsSync from "./hooks/useAllCompanyAccountsSync";
import { fetchCurrentCompany } from "./Slices/currentCompanySlice";
import { setupNotificationListenersForUser } from "./utils/listeners/setupNotificationListenersForUser";
import { setupNotificationListenersForCompany } from "./utils/listeners/setupNotificationListenerForCompany";
import UserModal from "./components/UserModal";
// import { auditPostDates, migratePostDates } from "./script";

function App(): React.JSX.Element {
  useSchemaVersion();
  useCompanyUsersSync();
  useAllCompanyAccountsSync();
  const dispatch = useAppDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const snackbar = useSelector((state: RootState) => state.snackbar);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const companyId = user?.companyId;
  // const salesRouteNum = user?.salesRouteNum;
  const { currentUser, initializing } = useFirebaseAuth();
  const theme = React.useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  useEffect(() => {}, []);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const cached = await getAllCompanyProductsFromIndexedDB();
        if (cached.length) dispatch(setAllProducts(cached));
        dispatch(fetchCompanyProducts(companyId));
        dispatch(fetchCurrentCompany(user.companyId)); // this is a new line
      } catch (err) {
        console.error("Product load failed", err);
      }
    })();
  }, [dispatch, companyId]);

  // 🌓 Set theme on first load based on localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      dispatch(setDarkMode(storedTheme === "dark"));
    }
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    if (companyId) {
      dispatch(loadCompany(user.companyId));
    }
  }, [user?.companyId, dispatch]);

  // 📡 Realtime listeners for goals and notifications
  useEffect(() => {
    // return
    if (!companyId || !currentUser?.companyId) return;
    const unsubscribeNotificationsForUser = dispatch(
      setupNotificationListenersForUser(currentUser)
    );
    const unsubscribeNotificationsForCompany = dispatch(
      setupNotificationListenersForCompany(currentUser)
    );
    const unsubscribeCompanyGoals = dispatch(
      setupCompanyGoalsListener(companyId)
    );
    const unsubscribeGalloGoals = dispatch(setupGalloGoalsListener(companyId));
    return () => {
      unsubscribeCompanyGoals();
      unsubscribeGalloGoals();
      unsubscribeNotificationsForUser();
      unsubscribeNotificationsForCompany();
    };
  }, [dispatch, currentUser]);

  if (initializing) return <></>;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ThemeToggle />
        <Router>
          <AppRoutes />
        </Router>
        <Snackbar
          message={snackbar.current?.text}
          open={snackbar.open}
          onClose={() => {
            dispatch(hideMessage());
            setTimeout(() => dispatch(nextMessage()), 300); // Cannot find name 'nextMessage'. Did you mean 'onmessage'?
          }}
          autoHideDuration={snackbar.current?.duration ?? 4000}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        />

        {!initializing && currentUser && <UserModal />}
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
