// userHomePage.tsx
import Button from "@mui/material/Button";
import LogOutButton from "./LogOutButton";
import { useNavigate } from "react-router-dom";
import { Container, Grid, AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";

import { useSelector } from "react-redux";

export const UserHomePage = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.user);
  console.log(currentUser, ' : currentUser');
  const openProfile = () => navigate("/profile-page");

  return (
    <Container className="container user-home-page">
      <AppBar position="fixed">
        <Toolbar>
          <Button variant="contained" color="secondary" onClick={openProfile}>
            Profile
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/createPost")}
          >
            Create Post
          </Button>
          <LogOutButton />
          <div>
            <h2>Welcome, {currentUser.user?.displayName}!</h2>
          </div>
        </Toolbar>
       
      </AppBar>

      <Grid container spacing={3} style={{ marginTop: "70px" }}>
        <Grid item xs={12}></Grid>
        <Grid item xs={12}>
          {/* Place your ActivityFeed component here */}
         
          <ActivityFeed />
        </Grid>
      </Grid>
    </Container>
  );
};
