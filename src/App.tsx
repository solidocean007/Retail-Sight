// app.tsx
import Snackbar from "@mui/material/Snackbar";
import { useSelector, useDispatch } from "react-redux";
import { hideMessage } from "./Slices/snackbarSlice";
import "./App.css";
import { SignUpLogin } from "./components/SignUpLogIn";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { UserHomePage } from "./components/UserHomePage";
import { UserProfilePage } from "./components/UserProfilePage";
import { CreatePost } from "./components/CreatePost";
import { RootState } from "./utils/store";
import { ThemeToggle } from "./ThemeToggle";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useFirebaseAuth } from "./utils/useFirebaseAuth";

import UserModal from "./components/UserModal.tsx";
import { selectIsUserModalOpen } from "./Slices/userModalSlice.ts";
import { handleUserNameClick } from "./utils/userModalUtils.ts";

export const onUserNameClick = (uid: string) => {
  handleUserNameClick(uid, dispatch);
}

function App() {
  const isUserModalOpen = useSelector(selectIsUserModalOpen);

  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);
  useFirebaseAuth();
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? "dark" : "light",
    },
  });
  const snackbar = useSelector((state: RootState) => state.snackbar);
  const dispatch = useDispatch();
  

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ThemeToggle />
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
        <UserModal isOpen={isUserModalOpen} />
      </ThemeProvider>
    </>
  );
}

export default App;
