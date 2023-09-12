// userHomePage.tsx
import { CreatePost } from "./CreatePost";
import Button from "@mui/material/Button";
import LogOutButton from "./LogOutButton";
import { useNavigate } from "react-router-dom";
import { Container, Grid, AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";
import { useState } from "react";

import { useSelector } from 'react-redux';

export const UserHomePage = () => {
  const navigate = useNavigate();
  const currentUser = useSelector(state => state.user);
  console.log(currentUser);
  const openProfile = () => navigate("/profile-page");
  const [isCreatePostOpen, setIsCreatePostOpen] = useState<boolean>(false);

  const toggleOpenCreatePost = () => {
    setIsCreatePostOpen((prevState) => !prevState);
  };

  return (
    <Container>
      {isCreatePostOpen && (
            <CreatePost
              toggleOpenCreatePost={toggleOpenCreatePost}
              isOpen={isCreatePostOpen}
            />
          )}
      <AppBar position="fixed">
        <Toolbar>
          <Button variant="contained" color="secondary" onClick={openProfile}>
            Profile
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={toggleOpenCreatePost}
          >
            Create Post
          </Button>
          <LogOutButton />
        </Toolbar>
      </AppBar>

      <Grid container spacing={3} style={{ marginTop: "70px" }}>
        <Grid item xs={12}>
          
        </Grid>
        <Grid item xs={12}>
          {/* Place your ActivityFeed component here */}
          <div>
            <h1>Welcome, {currentUser.displayName}!</h1>
        </div>
          <ActivityFeed />
        </Grid>
      </Grid>
    </Container>
  );
};
