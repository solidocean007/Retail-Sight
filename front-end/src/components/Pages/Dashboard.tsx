import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppBar, IconButton, Toolbar, useMediaQuery } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useSelector } from "react-redux";

import "./dashboard.css";
import { selectUser } from "../../Slices/userSlice.ts";
import type { DashboardModeType, UserType } from "../../utils/types.ts";
import { DashboardHelmet } from "../../utils/helmetConfigurations.tsx";
import DashMenu from "../DashMenu.tsx";
import PastDueBanner from "./Billing/PastDueBanner.tsx";
import { selectIsSupplier } from "../../Slices/currentCompanySlice.ts";
import { selectEffectiveCompanyId } from "../../Slices/impersonationSlice.ts";
import {
  getAllowedDashboardModes,
  getDefaultDashboardMode,
  resolveDashboardMode,
  type DashboardAccessContext,
} from "./dashboardModes.ts";

const UserProfileViewer = lazy(() => import("../UserProfileViewer.tsx"));
const CollectionsViewer = lazy(() => import("../CollectionsViewer.tsx"));
const TutorialViewer = lazy(() => import("../TutorialViewer.tsx"));
const AccountManager = lazy(
  () => import("../AccountManagement/AccountsManager.tsx"),
);
const GoalManagerLayout = lazy(
  () => import("../GoalIntegration/GoalManagerLayout.tsx"),
);
const ProductsManager = lazy(
  () => import("../ProductsManagement/ProductsManager.tsx"),
);
const MyGoals = lazy(() => import("../GoalIntegration/MyGoals.tsx"));
const AdminUsersConsole = lazy(
  () => import("../AdminDashboard/AdminUsersConsole.tsx"),
);
const TeamsViewer = lazy(() => import("../TeamsViewer.tsx"));
const MyAccounts = lazy(() => import("../MyAccounts.tsx"));
const CompanyConnectionsManager = lazy(
  () => import("../Connections/CompanyConnectionsManager.tsx"),
);
const NotificationCenter = lazy(
  () => import("../Notifications/NotificationCenter.tsx"),
);
const IntegrationsView = lazy(() => import("./IntegrationsView.tsx"));
const ComingSoonCard = lazy(() =>
  import("../ComingSoonCard.tsx").then((module) => ({
    default: module.ComingSoonCard,
  })),
);
const DeveloperViewAsPanel = lazy(
  () => import("../DeveloperDashboard/DeveloperViewAsPanel.tsx"),
);
const SupervisorFeedbackReview = lazy(
  () => import("../GoalReports/SupervisorFeedbackReview.tsx"),
);

type DashboardViewProps = {
  companyId?: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  mode: DashboardModeType;
  user: UserType | null;
};

const DashboardView = ({
  companyId,
  isAdmin,
  isSuperAdmin,
  mode,
  user,
}: DashboardViewProps) => {
  switch (mode) {
    case "AnnouncementsMode":
      return (
        <ComingSoonCard
          title="Announcements"
          description="Create and schedule announcements for your team."
        />
      );
    case "ConnectionsMode":
      return (
        <CompanyConnectionsManager currentCompanyId={companyId} user={user} />
      );
    case "IntegrationsMode":
      return <IntegrationsView />;
    case "TeamMode":
      return <TeamsViewer />;
    case "NotificationsMode":
      return <NotificationCenter />;
    case "AccountsMode":
      return <AccountManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />;
    case "ProductsMode":
      return <ProductsManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />;
    case "MyGoalsMode":
      return <MyGoals />;
    case "UsersMode2":
      return <AdminUsersConsole />;
    case "ProfileMode":
      return <UserProfileViewer />;
    case "MyAccountsMode":
      return <MyAccounts />;
    case "GoalManagerMode":
      return <GoalManagerLayout companyId={companyId} />;
    case "SupervisorFeedbackMode":
      return <SupervisorFeedbackReview />;
    case "CollectionsMode":
      return <CollectionsViewer />;
    case "TutorialMode":
      return <TutorialViewer />;
    case "DeveloperViewAsMode":
      return <DeveloperViewAsPanel />;
    default:
      return null;
  }
};

const DashboardViewFallback = () => (
  <div className="dashboard-view-loading" role="status">
    <span className="dashboard-view-loading__indicator" aria-hidden="true" />
    <span>Loading dashboard view…</span>
  </div>
);

export const Dashboard = () => {
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const user = useSelector(selectUser);
  const companyId = useSelector(selectEffectiveCompanyId);
  const isSupplier = useSelector(selectIsSupplier);
  const role = user?.role;
  const isAdmin = role === "admin";
  const isSuperAdmin = role === "super-admin";
  const accessContext = useMemo<DashboardAccessContext>(
    () => ({ isSupplier, role }),
    [isSupplier, role],
  );
  const allowedModes = useMemo(
    () => getAllowedDashboardModes(accessContext),
    [accessContext],
  );
  const [drawerOpen, setDrawerOpen] = useState(isLargeScreen);
  const [activeMode, setActiveMode] = useState<DashboardModeType>(() =>
    getDefaultDashboardMode(accessContext),
  );
  const restoredSessionMode = useRef(false);

  useEffect(() => {
    const requestedMode = restoredSessionMode.current
      ? activeMode
      : sessionStorage.getItem("dashboardMode");

    if (!restoredSessionMode.current) {
      restoredSessionMode.current = true;
      sessionStorage.removeItem("dashboardMode");
    }

    const resolvedMode = resolveDashboardMode(requestedMode, accessContext);
    if (resolvedMode !== activeMode) setActiveMode(resolvedMode);
  }, [accessContext, activeMode]);

  useEffect(() => {
    setDrawerOpen(isLargeScreen);
  }, [isLargeScreen]);

  const handleMenuClick = (mode: DashboardModeType) => {
    setActiveMode(resolveDashboardMode(mode, accessContext));
    if (!isLargeScreen) setDrawerOpen(false);
  };

  return (
    <div
      className={`dashboard-container${
        isLargeScreen ? " dashboard-container--desktop" : ""
      }`}
    >
      <DashboardHelmet />

      <DashMenu
        activeMode={activeMode}
        allowedModes={allowedModes}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant={isLargeScreen ? "permanent" : "temporary"}
        onMenuClick={handleMenuClick}
      />

      <div className="dashboard-body">
        {!isLargeScreen && (
          <AppBar className="dashboard-mobile-app-bar" position="static">
            <Toolbar className="dashboard-mobile-toolbar">
              <IconButton
                edge="start"
                color="inherit"
                aria-label="Open dashboard menu"
                onClick={() => setDrawerOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            </Toolbar>
          </AppBar>
        )}

        <PastDueBanner />

        <main className="dashboard-view" data-dashboard-mode={activeMode}>
          <Suspense fallback={<DashboardViewFallback />}>
            <DashboardView
              companyId={companyId}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              mode={activeMode}
              user={user}
            />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
