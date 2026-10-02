import type { ReactNode } from "react";
import { Box, Drawer, List, ListItemButton, ListItemText } from "@mui/material";

import HomeIcon from "@mui/icons-material/Home";
import ExtensionIcon from "@mui/icons-material/Extension";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import SchoolIcon from "@mui/icons-material/School";
import GroupIcon from "@mui/icons-material/Group";
import StoreIcon from "@mui/icons-material/Store";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";
import FlagIcon from "@mui/icons-material/OutlinedFlag";
import {
  CampaignOutlined,
  Handshake,
  Inventory2,
  NotificationsNoneOutlined,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import LogOutButton from "./LogOutButton";
import GoalIcon from "./icons/GoalIcon";

import "./dashMenu.css";

import type { DashboardModeType } from "../utils/types";
import { selectPendingAccountImports } from "../Slices/accountImportSlice";
import {
  selectCurrentCompany,
  selectIsSupplier,
} from "../Slices/currentCompanySlice";
import { selectUser } from "../Slices/userSlice";

type DashMenuProps = {
  activeMode: DashboardModeType;
  allowedModes: ReadonlySet<DashboardModeType>;
  open: boolean;
  onClose: () => void;
  variant: "temporary" | "permanent";
  onMenuClick: (mode: DashboardModeType) => void;
};

type DashboardNavItemProps = {
  active?: boolean;
  badge?: string;
  icon: ReactNode;
  label: string;
  onClick: () => void;
};

const DashboardNavItem = ({
  active = false,
  badge,
  icon,
  label,
  onClick,
}: DashboardNavItemProps) => (
  <ListItemButton
    className="dashboard-nav-item"
    selected={active}
    onClick={onClick}
  >
    <span className="dashboard-nav-item__icon" aria-hidden="true">
      {icon}
    </span>
    <ListItemText className="dashboard-nav-item__label" primary={label} />
    {badge && <span className="dashboard-nav-item__badge">{badge}</span>}
  </ListItemButton>
);

const formatRole = (role?: string) => {
  if (!role) return "Workspace";

  return role
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const DashMenu = ({
  activeMode,
  allowedModes,
  open,
  onClose,
  variant,
  onMenuClick,
}: DashMenuProps) => {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const currentCompany = useSelector(selectCurrentCompany);
  const isSupplier = useSelector(selectIsSupplier);
  const pendingImports = useSelector(selectPendingAccountImports);
  const role = user?.role;
  const companyName =
    currentCompany?.companyName || user?.company || "Displaygram";
  const workspaceType = isSupplier ? "Supplier workspace" : "Team workspace";
  const canAccessBilling = role === "admin" || role === "super-admin";
  const canAccessMode = (mode: DashboardModeType) => allowedModes.has(mode);
  const managementModes: DashboardModeType[] = isSupplier
    ? [
        "GoalManagerMode",
        "AnnouncementsMode",
        "ConnectionsMode",
        "UsersMode2",
        "IntegrationsMode",
      ]
    : [
        "AnnouncementsMode",
        "ConnectionsMode",
        "TeamMode",
        "AccountsMode",
        "ProductsMode",
        "UsersMode2",
        "GoalManagerMode",
        "IntegrationsMode",
      ];
  const showManagement = managementModes.some(canAccessMode);

  const selectMode = (mode: DashboardModeType) => {
    onMenuClick(mode);
  };

  return (
    <Drawer
      anchor="left"
      className="dashboard-drawer"
      open={open}
      onClose={onClose}
      variant={variant}
      sx={{
        width: "var(--dashboard-drawer-width, 252px)",
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: "var(--dashboard-drawer-width, 252px)",
          boxSizing: "border-box",
        },
      }}
    >
      <Box
        className="dashboard-drawer__layout"
        component="nav"
        aria-label="Dashboard navigation"
      >
        <header className="dashboard-drawer__header">
          <div className="dashboard-drawer__brand-mark" aria-hidden="true">
            <img src="/logos/displaygram-logo.svg" alt="" />
          </div>
          <div className="dashboard-drawer__identity">
            <span className="dashboard-drawer__eyebrow">Dashboard</span>
            <strong title={companyName}>{companyName}</strong>
            <span>{workspaceType}</span>
          </div>
        </header>

        <div className="dashboard-drawer__scroll-region">
          <section
            className="dashboard-nav-section"
            aria-labelledby="dashboard-workspace-heading"
          >
            <h2 id="dashboard-workspace-heading">Workspace</h2>
            <List disablePadding>
              <DashboardNavItem
                icon={<HomeIcon />}
                label="Home"
                onClick={() => navigate("/user-home-page")}
              />

              {canAccessMode("MyGoalsMode") && (
                <DashboardNavItem
                  active={activeMode === "MyGoalsMode"}
                  icon={<TrackChangesIcon />}
                  label="My Goals"
                  onClick={() => selectMode("MyGoalsMode")}
                />
              )}

              <DashboardNavItem
                active={activeMode === "ProfileMode"}
                icon={<AccountCircleIcon />}
                label="Profile"
                onClick={() => selectMode("ProfileMode")}
              />

              {canAccessMode("MyAccountsMode") && (
                <DashboardNavItem
                  active={activeMode === "MyAccountsMode"}
                  icon={<StoreIcon />}
                  label="My Accounts"
                  onClick={() => selectMode("MyAccountsMode")}
                />
              )}

              {canAccessMode("CollectionsMode") && (
                <DashboardNavItem
                  active={activeMode === "CollectionsMode"}
                  icon={<CollectionsBookmarkIcon />}
                  label="Collections"
                  onClick={() => selectMode("CollectionsMode")}
                />
              )}

              {canAccessMode("NotificationsMode") && (
                <DashboardNavItem
                  active={activeMode === "NotificationsMode"}
                  icon={<NotificationsNoneOutlined />}
                  label="Notifications"
                  onClick={() => selectMode("NotificationsMode")}
                />
              )}

              {canAccessMode("SupervisorFeedbackMode") && (
                <DashboardNavItem
                  active={activeMode === "SupervisorFeedbackMode"}
                  icon={<FlagIcon />}
                  label="Team Feedback"
                  onClick={() => selectMode("SupervisorFeedbackMode")}
                />
              )}

              <DashboardNavItem
                active={activeMode === "TutorialMode"}
                icon={<SchoolIcon />}
                label="Tutorial"
                onClick={() => selectMode("TutorialMode")}
              />
            </List>
          </section>

          {showManagement && (
            <section
              className="dashboard-nav-section"
              aria-labelledby="dashboard-management-heading"
            >
              <h2 id="dashboard-management-heading">
                {isSupplier ? "Supplier management" : "Management"}
              </h2>
              <List disablePadding>
                {canAccessMode("GoalManagerMode") && (
                  <DashboardNavItem
                    active={activeMode === "GoalManagerMode"}
                    icon={<GoalIcon />}
                    label={isSupplier ? "Partner Goals" : "Goals Manager"}
                    onClick={() => selectMode("GoalManagerMode")}
                  />
                )}

                {canAccessMode("AnnouncementsMode") && (
                  <DashboardNavItem
                    active={activeMode === "AnnouncementsMode"}
                    icon={<CampaignOutlined />}
                    label="Announcements"
                    onClick={() => selectMode("AnnouncementsMode")}
                  />
                )}

                {canAccessMode("ConnectionsMode") && (
                  <DashboardNavItem
                    active={activeMode === "ConnectionsMode"}
                    icon={<Handshake />}
                    label="Connections"
                    onClick={() => selectMode("ConnectionsMode")}
                  />
                )}

                {canAccessMode("TeamMode") && (
                  <DashboardNavItem
                    active={activeMode === "TeamMode"}
                    icon={<GroupIcon />}
                    label="Teams"
                    onClick={() => selectMode("TeamMode")}
                  />
                )}

                {canAccessMode("AccountsMode") && (
                  <DashboardNavItem
                    active={activeMode === "AccountsMode"}
                    badge={
                      pendingImports?.length
                        ? String(pendingImports.length)
                        : undefined
                    }
                    icon={<StoreIcon />}
                    label="Accounts"
                    onClick={() => selectMode("AccountsMode")}
                  />
                )}

                {canAccessMode("ProductsMode") && (
                  <DashboardNavItem
                    active={activeMode === "ProductsMode"}
                    icon={<Inventory2 />}
                    label="Products"
                    onClick={() => selectMode("ProductsMode")}
                  />
                )}

                {canAccessMode("UsersMode2") && (
                  <DashboardNavItem
                    active={activeMode === "UsersMode2"}
                    icon={<PeopleAltIcon />}
                    label="Users"
                    onClick={() => selectMode("UsersMode2")}
                  />
                )}

                {canAccessMode("IntegrationsMode") && (
                  <DashboardNavItem
                    active={activeMode === "IntegrationsMode"}
                    icon={<ExtensionIcon />}
                    label="Integrations"
                    onClick={() => selectMode("IntegrationsMode")}
                  />
                )}
              </List>
            </section>
          )}
        </div>

        <footer className="dashboard-drawer__footer">
          <span className="dashboard-drawer__account-label">
            {formatRole(role)}
          </span>

          {canAccessBilling && (
            <DashboardNavItem
              icon={<ReceiptLongIcon />}
              label="Billing"
              onClick={() => navigate("/billing")}
            />
          )}

          <div className="dashboard-drawer__logout">
            <LogOutButton />
          </div>
        </footer>
      </Box>
    </Drawer>
  );
};

export default DashMenu;
