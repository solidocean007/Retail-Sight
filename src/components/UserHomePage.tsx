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
import { AppDispatch } from "../utils/store";
import { ChannelType } from "./ChannelSelector";
import { CategoryType } from "./CategorySelector";
import { useDispatch } from "react-redux";
import { fetchLocationOptions } from "../Slices/locationSlice";

export const UserHomePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  // const { currentUser: currentUser } = useSelector((state: RootState) => state.user); // Does this work because userSlice now has a currentUser
  const { currentUser } = useSelector((state: RootState) => state.user); // Simplified extraction
  console.log(currentUser, " : currentUser");

  // States for selected filters
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>(
    []
  );

  // Selectors to get states and cities from the Redux store
  const { locations, loading, error } = useSelector(
    (state: RootState) => state.locations
  );

  useEffect(() => {
    console.log("UserHomePage mounted");
    // Dispatch the action to fetch location options
    dispatch(fetchLocationOptions()); // Argument of type 'AsyncThunkAction<LocationOptions, void, AsyncThunkConfig>' is not assignable to parameter of type 'AnyAction'.ts(2345)
  }, [dispatch]);

  useEffect(() => {
    console.log('Locations: ', locations, 'Loading: ', loading);
    if (!loading && locations) {
      console.log('Fetching options...');
      Object.entries(locations).forEach(([state, cities]) => {
        console.log(`State: ${state}, Cities: `, cities);
      });
    }
  }, [locations, loading]);
  

  if (loading) {
    return <div>Loading location options....</div>;
  }

  if ( error) {
    return <div>Error fetching locations: {error}</div>;
  }

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
              Welcome, {currentUser?.firstName} {currentUser?.lastName}{" "}
              {/*Here is the line that loses the users data on page refresh*/}
            </h2>
          </div>
        </Toolbar>
      </AppBar>

      <Grid container spacing={3} style={{ marginTop: "70px" }}>
        <Grid item xs={8}>
          {" "}
          {/* This will occupy 8/12 of the screen width */}
          <ActivityFeed
            selectedChannels={selectedChannels}
            selectedCategories={selectedCategories}
          />
        </Grid>
        <Grid className="side-bar-container" item xs={4}>
          {" "}
          {/* This will occupy 4/12 of the screen width for the sidebar */}
          {/* <SideBar openProfile={openProfile} /> */}
          <SideBar
            selectedChannels={selectedChannels}
            setSelectedChannels={setSelectedChannels}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
          />
        </Grid>
      </Grid>
    </Container>
  );
};
