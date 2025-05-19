// App.tsx
import Snackbar from "@mui/material/Snackbar";
import { useSelector } from "react-redux";
import { hideMessage } from "./Slices/snackbarSlice";
import "./App.css";
import { BrowserRouter as Router } from "react-router-dom";
import { RootState, useAppDispatch } from "./utils/store";
import { ThemeToggle } from "./components/ThemeToggle";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";
import UserModal from "./components/UserModal";
import { AppRoutes } from "./utils/Routes";
import { getTheme } from "./theme";
import { useEffect, useState } from "react";
import { setDarkMode } from "./Slices/themeSlice"; // ✅ New, clean import
import useSchemaVersion from "./hooks/useSchemaVersion";
import { setupCompanyGoalsListener } from "./utils/listeners/setupCompanyGoalsListener";
import { setupGalloGoalsListener } from "./utils/listeners/setupGalloGoalsListener";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { loadCompany } from "./thunks/companyThunk";

function App() {
  useSchemaVersion();
  const dispatch = useAppDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const snackbar = useSelector((state: RootState) => state.snackbar);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const companyId = user?.companyId;
  const salesRouteNum = user?.salesRouteNum;
  const { currentUser, initializing } = useFirebaseAuth();

  const [theme, setTheme] = useState(() => getTheme(isDarkMode));

  // 🌓 Set theme on first load based on localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      dispatch(setDarkMode(storedTheme === "dark"));
    }
  }, [dispatch]);

   useEffect(() => {
    if (companyId) {
      dispatch(loadCompany(user.companyId));
    }
  }, [user?.companyId, dispatch]);

  // 🧠 Rebuild MUI theme when Redux theme mode changes
  useEffect(() => {
    setTheme(getTheme(isDarkMode));
  }, [isDarkMode]);

  // 📡 Goal listeners
  useEffect(() => {
    if (!companyId) return;
    const unsubscribeCompanyGoals = dispatch(
      setupCompanyGoalsListener(companyId),
    );
    const unsubscribeGalloGoals = dispatch(setupGalloGoalsListener(companyId));
    return () => {
      unsubscribeCompanyGoals();
      unsubscribeGalloGoals();
    };
  }, [dispatch, companyId, salesRouteNum]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ThemeToggle />
        <Router>
          <AppRoutes />
        </Router>
        <Snackbar
          message={snackbar.message}
          open={snackbar.open}
          onClose={() => dispatch(hideMessage())}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        />
        {!initializing && currentUser && <UserModal />}
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
