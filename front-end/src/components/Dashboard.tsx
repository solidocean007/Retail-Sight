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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import EmployeesViewer from "./EmployeesViewer";
import UserProfileViewer from "./UserProfileViewer";
import { handleLogout } from "../utils/validation/authenticate";
import LogOutButton from "./LogOutButton";
import CollectionsViewer from "./CollectionsViewer";
import TutorialViewer from "./TutorialViewer";
import ApiView from "./ApiView.tsx";
import IntegrationView from "./IntegrationView.tsx";
// import MissionIntegrationView from "./MissionIntegrationView.tsx";
import MissionIntegrationViewDraft from "./MissionIntegration.tsx";
import AccountManager from "./AccountsManager.tsx";

type DashboardModeType =
  | "TeamMode"
  | "UsersMode"
  | "AccountsMode"
  | "ProfileMode"
  | "IntegrationMode"
  | "MissionIntegrationMode"
  | "ApiMode"
  | "CollectionsMode"
  | "TutorialMode";

export const Dashboard = () => {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const drawerWidth = 240;
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const [dashboardMode, setDashboardMode] =
    useState<DashboardModeType>("TeamMode");

  const user = useSelector(selectUser);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(isLargeScreen);
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

  const toggleDrawer = // what does this function do?
    (open: boolean) => (event: React.MouseEvent | React.KeyboardEvent) => {
      if (
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" || // what does tab and shift have to do with this function
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }
      setDrawerOpen(open);
    };

  useEffect(() => {
    setDrawerOpen(isLargeScreen);
  }, [isLargeScreen]);

  // Separate useEffect to attempt to load from IndexedDB when component mounts
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      // Attempt to get users from IndexedDB
      const indexedDBUsers = await getCompanyUsersFromIndexedDB();
      setCompanyUsers(indexedDBUsers);
      if (indexedDBUsers && indexedDBUsers.length > 0) {
        setLocalUsers(indexedDBUsers);
      }
    };

    loadFromIndexedDB();
  }, []);

  // should the button for toggleDrawer be hidden on screenwidths where the sidebar drawer is defaulted to open?
  // should the api mode be renamed as integration? or create a new tab for that?
  return (
    <Container>
      <DashboardHelmet />
      <Box sx={{ flexGrow: 1, ml: isLargeScreen ? `${drawerWidth}px` : 0 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h1" component="div" sx={{ flexGrow: 1, fontSize: "40px" }}>
              Dashboard
            </Typography>
            {!isLargeScreen && (
              <IconButton edge="start" color="inherit" aria-label="menu" onClick={toggleDrawer(true)}>
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
      </Box>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        variant={isLargeScreen ? "permanent" : "temporary"} // Toggle the variant based on screen size
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <List>
          <ListItem className="drawer-link">
            <LogOutButton />
          </ListItem>
          <ListItem className="drawer-link" onClick={() => navigate("/user-home-page")}>
            <ListItemText primary="Home" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("TeamMode")}>
            <ListItemText primary="Teams" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("AccountsMode")}>
            <ListItemText primary="Accounts" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("UsersMode")}>
            <ListItemText primary="Users" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("ProfileMode")}>
            <ListItemText primary="Profile" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("ApiMode")}>
            <ListItemText primary="Api" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("MissionIntegrationMode")}>
            <ListItemText primary="Mission Integration" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("IntegrationMode")}>
            <ListItemText primary="Integration" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("CollectionsMode")}>
            <ListItemText primary="Collections" />
          </ListItem>
          <ListItem className="drawer-link" onClick={handleMenuItemClick("TutorialMode")}>
            <ListItemText primary="Tutorial" />
          </ListItem>
        </List>
      </Drawer>

      <Box
        sx={{
          marginLeft: isLargeScreen ? `${drawerWidth}px` : 0,
          padding: 3, // Add some padding for better spacing
        }}
      >
        {dashboardMode === "TeamMode" && <TeamsViewer localUsers={localUsers} setLocalUsers={setLocalUsers} />}
        {dashboardMode === "AccountsMode" && <AccountManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin}/>}
        {dashboardMode === "UsersMode" && <EmployeesViewer localUsers={localUsers} setLocalUsers={setLocalUsers} />}
        {dashboardMode === "ProfileMode" && <UserProfileViewer user={user} />}
        {dashboardMode === "ApiMode" && <ApiView />}
        {dashboardMode === "MissionIntegrationMode" && <MissionIntegrationViewDraft />}
        {dashboardMode === "IntegrationMode" && <IntegrationView />}
        {dashboardMode === "CollectionsMode" && <CollectionsViewer />}
        {dashboardMode === "TutorialMode" && <TutorialViewer />}
      </Box>
    </Container>
  );
};


export default Dashboard;