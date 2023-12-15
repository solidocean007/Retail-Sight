// app.tsx
import Snackbar from "@mui/material/Snackbar";
import { useSelector, useDispatch } from "react-redux";
import { hideMessage } from "./Slices/snackbarSlice";
import "./App.css";
import { BrowserRouter as Router } from "react-router-dom"; 
import { RootState } from "./utils/store";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";

import UserModal from "./components/UserModal.tsx";
import { AppRoutes } from "./utils/Routes.tsx";
import { getTheme } from "./theme.ts";
import { useEffect } from "react";


function App() {
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  const { currentUser, initializing } = useFirebaseAuth();
 
  useEffect(() => {
    console.log('App.tsx mounts')
    
    return () => {
      console.log('App.tsx unmounted');
    };
  }, []);

  const theme = getTheme(isDarkMode);
  const snackbar = useSelector((state: RootState) => state.snackbar);
  const dispatch = useDispatch();

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ThemeToggle />
        <Router>
          <AppRoutes /> {/* Use your routes component here */}
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
