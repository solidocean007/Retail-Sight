import { useState } from "react";
import { CreatePost } from "./CreatePost";
import Button from "@mui/material/Button";
import LogOutButton from "./LogOutButton";
import { useNavigate } from "react-router-dom";
import { Container, Grid, AppBar, Toolbar } from "@mui/material";

export const UserHomePage = () => {
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  
  const openProfile = () => navigate('/profile-page');
  const openCreatePost = () => navigate('/CreatePost');

  return (
    <Container>
      <AppBar position="fixed">
        <Toolbar>
          <Button variant="contained" color="secondary" onClick={openProfile}>
            Profile
          </Button>
          <Button variant="contained" color="primary" onClick={openCreatePost}>
            Create Post
          </Button>
          <LogOutButton />
        </Toolbar>
      </AppBar>

      <Grid container spacing={3} style={{ marginTop: '70px' }}> 
        <Grid item xs={12}>
          {open && <CreatePost closeCreatePost={handleClose} />}
        </Grid>
        <Grid item xs={12}>
          {/* Place your ActivityFeed component here */}
        </Grid>
      </Grid>
    </Container>
  );
};
