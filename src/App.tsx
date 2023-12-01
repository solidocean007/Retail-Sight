// app.tsx
import Snackbar from "@mui/material/Snackbar";
import { useSelector, useDispatch } from "react-redux";
import { hideMessage } from "./Slices/snackbarSlice";
import "./App.css";
// import { SignUpLogin } from "./components/SignUpLogIn";
import { BrowserRouter as Router } from "react-router-dom"; // no exported member named Routes. Did i mean Route?
// import { UserHomePage } from "./components/UserHomePage";
// import { UserProfilePage } from "./components/UserProfilePage";
// import { CreatePost } from "./components/CreatePost";
import { RootState } from "./utils/store";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";

import UserModal from "./components/UserModal.tsx";
import { AppRoutes } from "./utils/Routes.tsx";
import { getTheme } from "./theme.ts";
// import { selectIsUserModalOpen } from "./Slices/userModalSlice.ts";


function App() {
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  useFirebaseAuth();
  // const theme = createTheme({
  //   palette: {
  //     mode: isDarkMode ? "dark" : "light",
  //   },
  // });
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
        <UserModal />
      </ThemeProvider>
    </>
  );
}

export default App;
