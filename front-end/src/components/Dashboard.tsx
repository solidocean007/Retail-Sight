// Dashboard.tsx
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import React, { useEffect, useState } from "react";
import {
  selectCompanyUsers,
  selectUser,
  setCompanyUsers,
} from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
  updateUserRoleInIndexedDB,
} from "../utils/database/userDataIndexedDB";
// import { fetchCompanyUsers } from "../thunks/usersThunks";
import { UserType } from "../utils/types";
import { RootState, useAppDispatch } from "../utils/store";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import "./dashboard.css";
import { DashboardHelmet } from "../utils/helmetConfigurations";
import { getFunctions, httpsCallable } from "@firebase/functions";
import PendingInvites from "./PendingInvites";
import TeamsViewer from "./TeamsViewer";
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import EmployeesViewer from "./EmployeesViewer";
import UserProfileViewer from "./UserProfileViewer";
import ApiViewer from "./ApiViewer";
import { handleLogout } from "../utils/validation/authenticate";
import LogOutButton from "./LogOutButton";
import CollectionsViewer from "./CollectionsViewer";

type DashboardModeType = "TeamMode" | "UsersMode" | "ProfileMode" | "ApiMode" | "CollectionsMode" | "TutorialMode";

export const Dashboard = () => {
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const [dashboardMode, setDashboardMode] =
    useState<DashboardModeType>("TeamMode");

  const user = useSelector(selectUser);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
 
  // const companyUsers = useSelector(selectCompanyUsers); // this is a selector to company users stored in state.  its not being used right now

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";
  const isSuperAdmin = user?.role === "super-admin";
  const companyName = user?.company;

  // const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const handleMenuItemClick = (mode: DashboardModeType) => () => {
    setDashboardMode(mode);
    setDrawerOpen(false);
  };

  const toggleDrawer =
    (open: boolean) => (event: React.MouseEvent | React.KeyboardEvent) => {
      if (
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }
      setDrawerOpen(open);
    };

  // Separate useEffect to attempt to load from IndexedDB when component mounts
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      // Attempt to get users from IndexedDB
      const indexedDBUsers = await getCompanyUsersFromIndexedDB();
      console.log(indexedDBUsers);
      setCompanyUsers(indexedDBUsers);
      if (indexedDBUsers && indexedDBUsers.length > 0) {
        setLocalUsers(indexedDBUsers);
      }
    };

    loadFromIndexedDB();
  }, []);

  return (
    <Container>
      <DashboardHelmet />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Dashboard
            </Typography>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      </Box>
      <Box>
        {dashboardMode === "TeamMode" && <TeamsViewer localUsers={localUsers} setLocalUsers={setLocalUsers} />}
        {dashboardMode === "UsersMode" && (
          <EmployeesViewer localUsers={localUsers} setLocalUsers={setLocalUsers} />
        )}
        {dashboardMode === "ProfileMode" && <UserProfileViewer user={user} />}
        {dashboardMode === "ApiMode" && <ApiViewer />}
        {dashboardMode === "CollectionsMode" && <CollectionsViewer />}
        {dashboardMode === "ApiMode" && <ApiViewer />}
      </Box>

      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <List>
          <ListItem onClick={() => navigate("/user-home-page")}>
            <ListItemText primary="Home" />
          </ListItem>
          <ListItem onClick={handleMenuItemClick("TeamMode")}>
            <ListItemText primary="Teams" />
          </ListItem>
          <ListItem onClick={handleMenuItemClick("UsersMode")}>
            <ListItemText primary="Users" />
          </ListItem>
          <ListItem onClick={handleMenuItemClick("ProfileMode")}>
            <ListItemText primary="Profile" />
          </ListItem>
          <ListItem onClick={handleMenuItemClick("ApiMode")}>
            <ListItemText primary="Api" />
          </ListItem>
          <ListItem onClick={handleMenuItemClick("CollectionsMode")}>
            <ListItemText primary="Collections" />
          </ListItem>
          <ListItem onClick={handleMenuItemClick("TutorialMode")}>
            <ListItemText primary="Tutorial" />
          </ListItem>
          <ListItem>
            {/* <ListItemText primary="Logout" /> */}
            <LogOutButton />
          </ListItem>
        </List>
      </Drawer>
    </Container>
  );
};

export default Dashboard;
