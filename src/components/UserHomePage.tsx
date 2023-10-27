// userHomePage.tsx
import { useEffect } from "react";
import Button from "@mui/material/Button";
import LogOutButton from "./LogOutButton";
import { useNavigate } from "react-router-dom";
import { Container, Grid, AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";

import { useSelector } from "react-redux";
import "./userHomePage.css";
import { RootState } from "../utils/store";
import SideBar from "./SideBar";

export const UserHomePage = () => {
  const navigate = useNavigate();
  const { currentUser: currentUser } = useSelector((state: RootState) => state.user); // Does this work because userSlice now has a currentUser
  console.log(currentUser, " : currentUser");
  const openProfile = () => navigate("/profile-page");

  useEffect(() => {
    console.log("UserHomePage mounted");
  }, []);

  return (
    <Container className="container user-home-page">
      <AppBar position="fixed">
        <Toolbar>
          <div className="tool-bar">
            <Button
              className="profile-btn"
              variant="contained"
              color="secondary"
              onClick={openProfile}
            >
              Profile
            </Button>
            <Button
              className="create-post-btn"
              variant="contained"
              color="primary"
              onClick={() => navigate("/createPost")}
            >
              Create Post
            </Button>
            <LogOutButton />
          </div>

          <div>
            <h2>
              Welcome, {currentUser?.firstName} {currentUser?.lastName} {/*Here is the line that loses the users data on page refresh*/}
            </h2>
          </div>
        </Toolbar>
      </AppBar>

      <Grid container spacing={3} style={{ marginTop: "70px" }}>
        <Grid item xs={8}>
          {" "}
          {/* This will occupy 8/12 of the screen width */}
          <ActivityFeed />
        </Grid>
        <Grid item xs={4}>
          {" "}
          {/* This will occupy 4/12 of the screen width for the sidebar */}
          <SideBar openProfile={openProfile} />
        </Grid>
      </Grid>
    </Container>
  );
};
