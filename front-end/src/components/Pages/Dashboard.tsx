// Dashboard.tsx
import { useSelector } from "react-redux";
import "./dashboard.css";
import React, { useEffect, useState } from "react";
import {
  selectUser,
} from "../../Slices/userSlice.ts";
// import {
//   getCompanyUsersFromIndexedDB,
//   saveCompanyUsersToIndexedDB,
// } from "../utils/database/userDataIndexedDB";
// import { fetchCompanyUsers } from "../thunks/usersThunks";
import {
  // CompanyAccountType,
  DashboardModeType,
  // UserType,
} from "../../utils/types.ts";
// import { useAppDispatch } from "../utils/store";
import "./dashboard.css";
import { DashboardHelmet } from "../../utils/helmetConfigurations.tsx";
// import TeamsViewer from "./TeamsViewer";
import {
  AppBar,
  Box,
  // Container,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import EmployeesViewer from "../EmployeesViewer.tsx";
import UserProfileViewer from "../UserProfileViewer.tsx";
import CollectionsViewer from "../CollectionsViewer.tsx";
import TutorialViewer from "../TutorialViewer.tsx";
import AccountManager from "../AccountManagement/AccountsManager.tsx";
import GoalManager from "../GoalIntegration/GoalManager.tsx";
import DashMenu from "../DashMenu.tsx";
import ProductsManager from "../ProductsManagement/ProductsManager.tsx";
import MyGoals from "../GoalIntegration/MyGoals.tsx";
import AdminUsersConsole from "../AdminDashboard/AdminUsersConsole.tsx";
import TeamsViewer from "../TeamsViewer.tsx";
import MyAccounts from "../MyAccounts.tsx";
import CompanyConnectionsManager from "../Connections/CompanyConnectionsManager.tsx";
import BillingDashboard from "./Billing/BillingDashboard.tsx";
import { useNavigate } from "react-router-dom";
import useProtectedAction from "../../utils/useProtectedAction.ts";

export const Dashboard = () => {
  const navigate = useNavigate();
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const drawerWidth = 240;
  // const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  // const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  // const companyUsers = useSelector(selectCompanyUsers);
  const companyId = user?.companyId;
  // const [drawerOpen, setDrawerOpen] = useState(isLargeScreen);
  const [drawerOpen, setDrawerOpen] = useState(true);
  // Note from chat:
  // Dashboard default mode race: const isEmployee = user?.role === "employee"; 
  // runs before the user is known, so the initial dashboardMode defaults to the 
  // non‑employee branch and never re-derives after the user loads.
  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isEmployee = user?.role === "employee";
  // const isEmployee = true;
  const isAdmin = user?.role === "admin";
  // const isDeveloper = user?.role === "developer"; // this needs to be used also
  const isSuperAdmin = user?.role === "super-admin";
  // const allAccounts = useSelector(selectAllCompanyAccounts);

  // handleUpdatePosts();

  const [dashboardMode, setDashboardMode] = useState<DashboardModeType>(
    isEmployee ? "MyGoalsMode" : "GoalManagerMode"
  );

  const [selectedMode, setSelectedMode] = useState<DashboardModeType>(
    isEmployee ? "MyGoalsMode" : "GoalManagerMode"
  );

  const [_screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const savedMode = sessionStorage.getItem(
      "dashboardMode"
    ) as DashboardModeType;
    if (savedMode) {
      setDashboardMode(savedMode);
      setSelectedMode(savedMode);
      sessionStorage.removeItem("dashboardMode");
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const handleMenuClick = (mode: DashboardModeType) => {
    setSelectedMode(mode);
    setDashboardMode(mode); // ✅ now the render logic responds!
    setDrawerOpen(false);
    console.log(mode)
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

  useEffect(() => {
    // if we flip into desktop view, open the drawer
    if (isLargeScreen) {
      setDrawerOpen(true);
    }
    // but if we flip into mobile, leave whatever state we were in
  }, [isLargeScreen]);

  return (
    <div className="dashboard-container">
      <DashboardHelmet />
      <Box sx={{ flexGrow: 1, ml: isLargeScreen ? `${drawerWidth}px` : 0 }}>
        <AppBar position="static">
          <Toolbar
            sx={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--dashboard-header-background)",
              // backgroundColor: "red",
              color: "var(--text-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h1"
              component="h1"
              sx={{
                flexGrow: 1,
                fontSize: "40px",
                // backgroundColor: "var(--menu-background-color)", // ✅ THEMED
                color: "var(--text-color)",
              }}
            >
              Dashboard
            </Typography>
            {/* <Typography variant="caption" color="textSecondary">
              Screen Width: {screenWidth}px
            </Typography> */}

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
      <DashMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant={isLargeScreen ? "permanent" : "temporary"}
        onMenuClick={handleMenuClick}
        isEmployee={isEmployee}
        selectedMode={selectedMode} // ✅ pass current selection
      />
      <Box
        sx={{
          marginLeft: isLargeScreen ? `${drawerWidth}px` : 0,
          padding: 0,
          height: "100%",
        }}
      >
        {dashboardMode === "ConnectionsMode" && (
          <CompanyConnectionsManager currentCompanyId={companyId} user={user} />
        )}
        {dashboardMode === "TeamMode" && (
          <TeamsViewer />
        )}
        {dashboardMode === "AccountsMode" && (
          <AccountManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        )}
        {dashboardMode === "ProductsMode" && (
          <ProductsManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        )}
        {dashboardMode === "MyGoalsMode" && <MyGoals  />}
        {/* {dashboardMode === "UsersMode" && <EmployeesViewer />} */}
        {dashboardMode === "UsersMode2" && <AdminUsersConsole />}
        {dashboardMode === "ProfileMode" && user && <UserProfileViewer />}
        {dashboardMode === "MyAccountsMode" && user && <MyAccounts />}
        {dashboardMode === "GoalManagerMode" && (
          <GoalManager companyId={companyId} />
        )}
       
        {dashboardMode === "CollectionsMode" && (
          <CollectionsViewer setDashboardMode={setDashboardMode} />
        )}
        {dashboardMode === "TutorialMode" && <TutorialViewer />}
      </Box>
     
    </div>
  );
};

export default Dashboard;
