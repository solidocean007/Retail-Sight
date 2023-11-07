// userHomePage.tsx
import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import LogOutButton from "./LogOutButton";
import { useNavigate } from "react-router-dom";
import { Container, Grid, AppBar, Toolbar } from "@mui/material";
import ActivityFeed from "./ActivityFeed";

import { useSelector } from "react-redux";
import "./userHomePage.css";
import { RootState } from "../utils/store";
import SideBar from "./SideBar";

import { ChannelType } from "./ChannelSelector";
import { CategoryType } from "./CategorySelector";

export const UserHomePage = () => {
  const navigate = useNavigate();
  // const { currentUser: currentUser } = useSelector((state: RootState) => state.user); // Does this work because userSlice now has a currentUser
  const { currentUser } = useSelector((state: RootState) => state.user); // Simplified extraction
  console.log(currentUser, " : currentUser");

   // States for selected filters
   const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([]);
   const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
   

  useEffect(() => {
    console.log("UserHomePage mounted");
  }, []);

  const openProfile = () => navigate("/profile-page");


  return (
    <Container className="container-user-home-page">
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
          <ActivityFeed selectedChannels={selectedChannels} selectedCategories={selectedCategories} />
        </Grid>
        <Grid className="side-bar-container" item xs={4}>
          {" "}
          {/* This will occupy 4/12 of the screen width for the sidebar */}
          {/* <SideBar openProfile={openProfile} /> */}
          <SideBar selectedChannels={selectedChannels} setSelectedChannels={setSelectedChannels} selectedCategories={selectedCategories} setSelectedCategories={setSelectedCategories}/>
        </Grid>
      </Grid>
    </Container>
  );
};
