// Dashboard.tsx
import { useSelector } from "react-redux";
import "./dashboard.css";
import React, { useEffect, useState } from "react";
import { selectUser } from "../../Slices/userSlice.ts";
import {
  DashboardModeType,
} from "../../utils/types.ts";
import "./dashboard.css";
import { DashboardHelmet } from "../../utils/helmetConfigurations.tsx";
import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import UserProfileViewer from "../UserProfileViewer.tsx";
import CollectionsViewer from "../CollectionsViewer.tsx";
import TutorialViewer from "../TutorialViewer.tsx";
import AccountManager from "../AccountManagement/AccountsManager.tsx";
import GoalManagerLayout from "../GoalIntegration/GoalManagerLayout.tsx";
import DashMenu from "../DashMenu.tsx";
import ProductsManager from "../ProductsManagement/ProductsManager.tsx";
import MyGoals from "../GoalIntegration/MyGoals.tsx";
import AdminUsersConsole from "../AdminDashboard/AdminUsersConsole.tsx";
import TeamsViewer from "../TeamsViewer.tsx";
import MyAccounts from "../MyAccounts.tsx";
import CompanyConnectionsManager from "../Connections/CompanyConnectionsManager.tsx";
import NotificationSettingsPanel from "../Notifications/NotificationSettingsPanel.tsx";
import IntegrationsView from "./IntegrationsView.tsx";

const ADMIN_MODES: DashboardModeType[] = [
  "ConnectionsMode",
  "TeamMode",
  "AccountsMode",
  "ProductsMode",
  "UsersMode2",
  "GoalManagerMode",
  "IntegrationsMode",
];


export const Dashboard = () => {
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const isIpadMini = useMediaQuery("(max-width: 767px)");
  const drawerWidth = 200;
  const user = useSelector(selectUser);
  const companyId = user?.companyId;
  const [drawerOpen, setDrawerOpen] = useState(true);

  const isEmployee = user?.role === "employee";
  const isSupervisor = user?.role === "supervisor";
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.role === "super-admin";
  const isDeveloper = user?.role === "developer";

  const canAccessAdmin = isAdmin || isSuperAdmin || isDeveloper;

  const defaultMode: DashboardModeType = canAccessAdmin
    ? "GoalManagerMode"
    : "MyGoalsMode";

  const [dashboardMode, setDashboardMode] =
    useState<DashboardModeType>(defaultMode);

  const [selectedMode, setSelectedMode] =
    useState<DashboardModeType>(defaultMode);

  const [_screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
  const savedMode = sessionStorage.getItem("dashboardMode") as DashboardModeType;

  if (savedMode) {
    if (!canAccessAdmin && ADMIN_MODES.includes(savedMode)) {
      setDashboardMode("MyGoalsMode");
      setSelectedMode("MyGoalsMode");
    } else {
      setDashboardMode(savedMode);
      setSelectedMode(savedMode);
    }

    sessionStorage.removeItem("dashboardMode");
  }
}, [canAccessAdmin]);


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
    console.log(mode);
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
    if (isIpadMini) {
      setDrawerOpen(false);
    }
    // but if we flip into mobile, leave whatever state we were in
  }, [isLargeScreen]);

  return (
    <div className="dashboard-container">
      <DashboardHelmet />
      <Box sx={{ flexGrow: 1, ml: isLargeScreen ? `${drawerWidth}px` : 0 }}>
        <AppBar position="static">
          {!isLargeScreen && (
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
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={toggleDrawer(true)}
              >
                <MenuIcon />
              </IconButton>
            </Toolbar>
          )}
        </AppBar>
      </Box>
      <DashMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant={isLargeScreen ? "permanent" : "temporary"}
        onMenuClick={handleMenuClick}
        isEmployee={isEmployee}
        canAccessAdmin={canAccessAdmin}
        selectedMode={selectedMode}
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
        {dashboardMode === "IntegrationsMode" && <IntegrationsView />}
        {dashboardMode === "TeamMode" && <TeamsViewer />}
        {dashboardMode === "NotificationsMode" && <NotificationSettingsPanel />}
        {dashboardMode === "AccountsMode" && (
          <AccountManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        )}
        {dashboardMode === "ProductsMode" && (
          <ProductsManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        )}
        {dashboardMode === "MyGoalsMode" && <MyGoals />}
        {/* {dashboardMode === "UsersMode" && <EmployeesViewer />} */}
        {dashboardMode === "UsersMode2" && canAccessAdmin && (
          <AdminUsersConsole />
        )}
        {dashboardMode === "ProfileMode" && user && <UserProfileViewer />}
        {dashboardMode === "MyAccountsMode" && user && <MyAccounts />}
        {dashboardMode === "GoalManagerMode" && canAccessAdmin && (
          <GoalManagerLayout companyId={companyId} />
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
