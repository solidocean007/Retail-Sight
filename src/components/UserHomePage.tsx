// userHomePage.tsx
import { useEffect } from "react";
import Button from "@mui/material/Button";
import LogOutButton from "./LogOutButton";
import { useNavigate } from "react-router-dom";
import { Container, Grid, AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";

import { useSelector } from "react-redux";
import "./userHomePage.css"
import { RootState } from "../utils/store";

export const UserHomePage = () => {
  const navigate = useNavigate();
  const {user: currentUser} = useSelector((state: RootState) => state.user);
  console.log(currentUser, ' : currentUser');
  const openProfile = () => navigate("/profile-page");

  useEffect(() => {
    console.log("UserHomePage mounted");
  }, []);
  

  return (
    <Container className="container user-home-page">
      <AppBar position="fixed">
        <Toolbar>
          <div className="tool-bar">
          <Button className="profile-btn" variant="contained" color="secondary" onClick={openProfile}>
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
            <h2>Welcome, {currentUser?.firstName} {currentUser?.lastName}</h2>
          </div>
        </Toolbar>
       
      </AppBar>

      <Grid container spacing={3} style={{ marginTop: "70px" }}>
        <Grid item xs={12}></Grid>
        <Grid item xs={12}>
          <ActivityFeed />
        </Grid>
      </Grid>
    </Container>
  );
};
