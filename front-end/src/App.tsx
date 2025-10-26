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
import { useIntegrations } from "./hooks/useIntegrations";
import useUserAccountsSync from "./hooks/useUserAccountsSync";
import { useCustomAccountsSync } from "./hooks/useCustomAccountsSync";
import { backfillMissingCompanyIdForHealy } from "./script";
import { auditPostsMissingCompanyId } from "./script";
import { useCompanyConnectionsListener } from "./hooks/useCompanyConnectionsListener";
// import { migrateCompanyNameUsers } from "./script";

function App(): React.JSX.Element {
  const user = useSelector((state: RootState) => state.user.currentUser);

  useSchemaVersion();
  useCompanyUsersSync();
  useUserAccountsSync();
  useAllCompanyAccountsSync(
    user?.role === "admin" ||
      user?.role === "super-admin" ||
      user?.role == "supervisor"
  );
  useCustomAccountsSync(); // ✅ Sync custom manual accounts
  useCompanyConnectionsListener();


  const dispatch = useAppDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const snackbar = useSelector((state: RootState) => state.snackbar);
  const companyId = user?.companyId;
  // const salesRouteNum = user?.salesRouteNum;
  const { currentUser, initializing } = useFirebaseAuth();
  const theme = React.useMemo(() => getTheme(isDarkMode), [isDarkMode]);

  const { isEnabled } = useIntegrations();
  const galloEnabled = isEnabled("gallo");

  useEffect(() => {
    // auditPostsMissingCompanyId();
    // backfillMissingCompanyIdForHealy();
  }, []);

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
    const unsubs: Array<() => void> = [];

    // always-on listeners
    unsubs.push(dispatch(setupNotificationListenersForUser(currentUser)));
    unsubs.push(dispatch(setupNotificationListenersForCompany(currentUser)));
    unsubs.push(dispatch(setupCompanyGoalsListener(companyId)));

    // only when this company has the gallo integration enabled
    if (galloEnabled) {
      unsubs.push(dispatch(setupGalloGoalsListener(companyId)));
    }

    return () => {
      for (const u of unsubs)
        try {
          u && u();
        } catch {}
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
        {snackbar.current && (
          <Snackbar
            open={snackbar.open}
            onClose={() => {
              dispatch(hideMessage());
              setTimeout(() => dispatch(nextMessage()), 300);
            }}
            autoHideDuration={snackbar.current.duration ?? 4000}
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
