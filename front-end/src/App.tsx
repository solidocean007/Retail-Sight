// app.tsx
import Snackbar from "@mui/material/Snackbar";
import { useSelector } from "react-redux";
import { hideMessage } from "./Slices/snackbarSlice";
import "./App.css";
import { BrowserRouter as Router } from "react-router-dom"; 
import { RootState, useAppDispatch } from "./utils/store";
import { ThemeToggle } from "./components/ThemeToggle.tsx";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";

import UserModal from "./components/UserModal.tsx";
import { AppRoutes } from "./utils/Routes.tsx";
import { getTheme } from "./theme.ts";
import { useEffect } from "react";
import { toggleTheme } from "./actions/themeActions.ts";
import useSchemaVersion from "./hooks/useSchemaVersion.ts";
import { setupCompanyGoalsListener } from "./utils/listeners/setupCompanyGoalsListener.ts";
import { setupGalloGoalsListener } from "./utils/listeners/setupGalloGoalsListener.ts";

function App() {
  useSchemaVersion();
  const dispatch = useAppDispatch();
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const snackbar = useSelector((state: RootState) => state.snackbar);
  const user = useSelector((state: RootState) => state.user.currentUser);
  const companyId = user?.companyId;
  const salesRouteNum = user?.salesRouteNum;
 
  const { currentUser, initializing } = useFirebaseAuth();

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const prefersDarkMode = storedTheme === 'dark';

     // Apply the theme from localStorage on initial load
     if (prefersDarkMode !== isDarkMode) {
      dispatch(toggleTheme());
    }
  }, [dispatch, isDarkMode]);

  useEffect(() => {
    if (!companyId) return;

    // Initialize the listeners
    const unsubscribeCompanyGoals = dispatch(setupCompanyGoalsListener(companyId));
    const unsubscribeGalloGoals = dispatch(
      setupGalloGoalsListener(companyId, salesRouteNum)
    );

    return () => {
      // Clean up the listeners
      unsubscribeCompanyGoals();
      unsubscribeGalloGoals();
    };
  }, [dispatch, companyId, salesRouteNum]);

  const theme = getTheme(isDarkMode);

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ThemeToggle />
        <Router>
          <AppRoutes /> {/* Use your routes component here */}
          {/* <Footer /> */}
        </Router>
        <Snackbar
          message={snackbar.message}
          open={snackbar.open}
          onClose={() => dispatch(hideMessage())}
          autoHideDuration={3000}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        />
         {/* Conditionally render the UserModal if currentUser exists and auth has finished initializing */}
         {!initializing && currentUser && <UserModal />}
      </ThemeProvider>
    </>
  );
}

export default App;
