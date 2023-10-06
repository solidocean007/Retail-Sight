import { useEffect } from "react";
import Snackbar from "@mui/material/Snackbar";
import { useSelector, useDispatch } from "react-redux";
import { hideMessage } from "./Slices/snackbarSlice";
import "./App.css";
import { SignUpLogin } from "./components/SignUpLogIn";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { UserHomePage } from "./components/UserHomePage";
import { UserProfilePage } from "./components/UserProfilePage";
import { CreatePost } from "./components/CreatePost";

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { setUser, logoutUser } from './Slices/userSlice';


import { RootState } from "./utils/store"; // import RootState
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";

function App() {
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  useFirebaseAuth();
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });
  const snackbar = useSelector((state: RootState) => state.snackbar);
  const dispatch = useDispatch();

  // useEffect(() => {
  //   const auth = getAuth();
  //   const unsubscribe = onAuthStateChanged(auth, user => {
  //     if (user) {
  //       const plainUser = {
  //         uid: user.uid,
  //         comapny: user.company, // does not exist on type user.
  //         email: user.email,
  //         displayName: user.displayName, // I created a new user and this was null
  //         phone: user.phoneNumber,
  //       }
  //       dispatch(setUser(plainUser)); // Type 'User' is missing the following properties from type 'UserType': firstName, lastName
  //     } else {
  //       dispatch(logoutUser());
  //     }
  //   });

  //   // Cleanup subscription on unmount
  //   return () => unsubscribe();
  // }, [dispatch]);

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
      <ThemeToggle/>
      <Router>
        <Routes>
          <Route path="/" element={<SignUpLogin />} />
          <Route path="/userHomePage" element={<UserHomePage />} />
          <Route path="/profile-page" element={<UserProfilePage />} />
          <Route path="/createPost" element={<CreatePost />} />
        </Routes>
      </Router>
      <Snackbar
        message={snackbar.message}
        open={snackbar.open}
        onClose={() => dispatch(hideMessage())}
        autoHideDuration={3000} // Auto hides after 3 seconds
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        /* other snackbar props */
      />
      </ThemeProvider>
    </>
  );
}

export default App;
