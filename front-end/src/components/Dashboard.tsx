// Dashboard.tsx
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import React, { useEffect, useState } from "react";
import { selectUser, setCompanyUsers } from "../Slices/userSlice";
import { getCompanyUsersFromIndexedDB, saveCompanyUsersToIndexedDB } from "../utils/database/userDataIndexedDB";
// import { fetchCompanyUsers } from "../thunks/usersThunks";
import { UserType } from "../utils/types";
import { RootState, useAppDispatch } from "../utils/store";
import "./dashboard.css";
import { DashboardHelmet } from "../utils/helmetConfigurations";
import TeamsViewer from "./TeamsViewer";
import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import EmployeesViewer from "./EmployeesViewer";
import UserProfileViewer from "./UserProfileViewer";
import LogOutButton from "./LogOutButton";
import CollectionsViewer from "./CollectionsViewer";
import TutorialViewer from "./TutorialViewer";
import AccountManager from "./AccountsManager.tsx";
import MyGoals from "./MyGoals.tsx";
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../utils/firebase.ts";
import GoalManager from "./GoalIntegration/GoalManager.tsx";

type DashboardModeType =
  | "TeamMode"
  | "UsersMode"
  | "AccountsMode"
  | "MyGoalsMode"
  | "ProfileMode"
  | "IntegrationMode"
  | "GoalManagerMode"
  | "ApiMode"
  | "CollectionsMode"
  | "TutorialMode";

export const Dashboard = () => {
  const theme = useTheme(); // i should use this
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const drawerWidth = 240;
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(isLargeScreen);

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isEmployee = user?.role === "employee";
  // const isEmployee = true;
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer"; // this needs to be used also
  const isSuperAdmin = user?.role === "super-admin";

  const [dashboardMode, setDashboardMode] = useState<DashboardModeType>(
    isEmployee ? "ProfileMode" : "GoalManagerMode"
  );

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

  useEffect(() => {
    const syncCompanyUsers = async () => {
      if (!user?.companyId) return;
  
      const companyId = user.companyId;
  
      // 1. Load cached users from IndexedDB
      const cachedUsers = await getCompanyUsersFromIndexedDB();
      if (cachedUsers && cachedUsers.length > 0) {
        dispatch(setCompanyUsers(cachedUsers)); // Update Redux store
        setLocalUsers(cachedUsers); // Update local state
      }
  
      // 2. Real-time Firestore listener
      const q = query(collection(db, "users"), where("companyId", "==", companyId));
      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          const usersFromFirestore = snapshot.docs.map(
            (doc) =>
              ({
                ...doc.data(),
                uid: doc.id,
              } as UserType)
          );
  
          // 3. Update Redux store and IndexedDB if Firestore data changes
          dispatch(setCompanyUsers(usersFromFirestore));
          setLocalUsers(usersFromFirestore);
          await saveCompanyUsersToIndexedDB(usersFromFirestore);
        },
        (error) => {
          console.error("Error syncing company users:", error);
        }
      );
  
      return () => unsubscribe(); // Cleanup listener
    };
  
    syncCompanyUsers();
  }, [user?.companyId, dispatch]);
  

  return (
    <Container disableGutters maxWidth={false}>
      <DashboardHelmet />
      <Box sx={{ flexGrow: 1, ml: isLargeScreen ? `${drawerWidth}px` : 0 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography
              variant="h1"
              component="div"
              sx={{ flexGrow: 1, fontSize: "40px" }}
            >
              Dashboard
            </Typography>
            {!isLargeScreen && (
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={toggleDrawer(true)}
              >
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
          {/* General Items */}
          <ListSubheader
            sx={{ backgroundColor: "inherit", fontWeight: "bold" }}
          >
            General
          </ListSubheader>
          <ListItemButton onClick={() => navigate("/user-home-page")}>
            <ListItemText primary="Home" />
          </ListItemButton>
          <ListItemButton onClick={handleMenuItemClick("MyGoalsMode")}>
            <ListItemText primary="My Goals" />
          </ListItemButton>
          <ListItemButton onClick={handleMenuItemClick("ProfileMode")}>
            <ListItemText primary="Profile" />
          </ListItemButton>
          <ListItemButton onClick={handleMenuItemClick("CollectionsMode")}>
            <ListItemText primary="Collections" />
          </ListItemButton>
          <ListItemButton onClick={handleMenuItemClick("TutorialMode")}>
            <ListItemText primary="Tutorial" />
          </ListItemButton>

          {/* Admin Items */}
          <Box
            sx={{
              opacity: isEmployee ? 0.4 : 1, // Visually dim for employees
              pointerEvents: isEmployee ? "none" : "auto", // Disable clicks for employees
              backgroundColor: "lightblue",
              paddingY: 1, // Add vertical padding for spacing
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: "bold",
                color: "black",
                paddingLeft: "16px", // Match ListItem padding
                paddingBottom: "4px",
              }}
            >
              Admin
            </Typography>

            <ListItemButton onClick={handleMenuItemClick("TeamMode")}>
              <ListItemText primary="Teams" />
            </ListItemButton>
            <ListItemButton onClick={handleMenuItemClick("AccountsMode")}>
              <ListItemText primary="Accounts" />
            </ListItemButton>
            <ListItemButton onClick={handleMenuItemClick("UsersMode")}>
              <ListItemText primary="Users" />
            </ListItemButton>
            <ListItemButton onClick={handleMenuItemClick("GoalManagerMode")}>
              <ListItemText primary="Goal Manager" />
            </ListItemButton>
          </Box>

          {/* Logout */}
          <ListItem>
            <LogOutButton />
          </ListItem>
        </List>
      </Drawer>

      <Box
        sx={{
          marginLeft: isLargeScreen ? `${drawerWidth}px` : 0,
          padding: 3, // Add some padding for better spacing
        }}
      >
        {dashboardMode === "TeamMode" && (
          <TeamsViewer localUsers={localUsers} setLocalUsers={setLocalUsers} />
        )}
        {dashboardMode === "AccountsMode" && (
          <AccountManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        )}
        {dashboardMode === "MyGoalsMode" && <MyGoals />}
        {dashboardMode === "UsersMode" && (
          <EmployeesViewer
            localUsers={localUsers}
            setLocalUsers={setLocalUsers}
          />
        )}
        {dashboardMode === "ProfileMode" && <UserProfileViewer user={user} />}
        {dashboardMode === "GoalManagerMode" && <GoalManager />}
        {dashboardMode === "CollectionsMode" && <CollectionsViewer />}
        {dashboardMode === "TutorialMode" && <TutorialViewer />}
      </Box>
    </Container>
  );
};

export default Dashboard;
