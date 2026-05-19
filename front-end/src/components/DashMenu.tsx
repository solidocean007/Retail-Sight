// DashMenu.tsx
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";

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
import { Handshake, Inventory2, NotificationAdd } from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import LogOutButton from "./LogOutButton";
import UpgradePromptBanner from "./UpgradePromptBanner";
import GoalIcon from "./icons/GoalIcon";

import "./dashMenu.css";

import { DashboardModeType } from "../utils/types";
import { RootState, useAppDispatch } from "../utils/store";
import { selectPendingAccountImports } from "../Slices/accountImportSlice";
import { selectIsSupplier } from "../Slices/currentCompanySlice";
import { selectUser } from "../Slices/userSlice";
import { stopImpersonation, stopViewAsCompany } from "../Slices/impersonationSlice";

const drawerWidth = 200;

type DashMenuProps = {
  open: boolean;
  onClose: () => void;
  variant: "temporary" | "permanent";
  onMenuClick: (mode: DashboardModeType) => void;
  isEmployee: boolean;
  canAccessAdmin: boolean;
  selectedMode: DashboardModeType;
};

const DashMenu = ({
  open,
  onClose,
  variant,
  onMenuClick,
  canAccessAdmin,
  selectedMode,
}: DashMenuProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const realUser = useSelector(selectUser);
  const isDeveloper = realUser?.role === "developer";
  const isImpersonating = useSelector((s: RootState) => s.impersonation.active);
  const role = useSelector((state: RootState) => state.user.currentUser?.role);
  const isSupplier = useSelector(selectIsSupplier);
  const pendingImports = useSelector(selectPendingAccountImports);

  // const companyPlan = useSelector(
  //   (state: RootState) => state.currentCompany?.data?.billing?.plan || "free",
  // );

  // const connectionCount = useSelector(
  //   (state: RootState) => state.currentCompany?.connectionCount,
  // );

  const canAccessBilling = role === "admin" || role === "super-admin";

  const canAccessIntegrations =
    role === "admin" || role === "super-admin" || role === "developer";

  // const showUpgradeBanner =
  //   (role === "admin" || role === "super-admin") &&
  //   (companyPlan === "free" || connectionCount >= 3);

  const showDistributorAdminTools = canAccessAdmin && !isSupplier;
  const showSupplierAdminTools = canAccessAdmin && isSupplier;

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant={variant}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "var(--drawer-background)",
          color: "var(--text-color)",
        },
      }}
    >
      <List>
        <ListItemButton onClick={() => navigate("/user-home-page")}>
          <HomeIcon sx={{ mr: 1 }} />
          <ListItemText primary="Home" />
        </ListItemButton>
        {isDeveloper && isImpersonating && (
          <button onClick={() => dispatch(stopViewAsCompany())}>
            Exit View-As
          </button>
        )}
        {!isSupplier && (
          <ListItemButton
            selected={selectedMode === "MyGoalsMode"}
            onClick={() => onMenuClick("MyGoalsMode")}
          >
            <TrackChangesIcon sx={{ mr: 1 }} />
            <ListItemText primary="My Goals" />
          </ListItemButton>
        )}

        <ListItemButton
          selected={selectedMode === "ProfileMode"}
          onClick={() => onMenuClick("ProfileMode")}
        >
          <AccountCircleIcon sx={{ mr: 1 }} />
          <ListItemText primary="Profile" />
        </ListItemButton>

        {!isSupplier && (
          <ListItemButton
            selected={selectedMode === "MyAccountsMode"}
            onClick={() => onMenuClick("MyAccountsMode")}
          >
            <StoreIcon sx={{ mr: 1 }} />
            <ListItemText primary="My Accounts" />
          </ListItemButton>
        )}

        <ListItemButton
          selected={selectedMode === "CollectionsMode"}
          onClick={() => onMenuClick("CollectionsMode")}
        >
          <CollectionsBookmarkIcon sx={{ mr: 1 }} />
          <ListItemText primary="Collections" />
        </ListItemButton>

        <ListItemButton
          selected={selectedMode === "NotificationsMode"}
          onClick={() => onMenuClick("NotificationsMode")}
        >
          <NotificationAdd sx={{ mr: 1 }} />
          <ListItemText primary="Notifications" />
        </ListItemButton>

        <ListItemButton
          selected={selectedMode === "TutorialMode"}
          onClick={() => onMenuClick("TutorialMode")}
        >
          <SchoolIcon sx={{ mr: 1 }} />
          <ListItemText primary="Tutorial" />
        </ListItemButton>

        {showSupplierAdminTools && (
          <Box className="menu-section-admin">
            <Typography variant="subtitle1" className="menu-section-title">
              Supplier Admin
            </Typography>

            <ListItemButton
              selected={selectedMode === "AnnouncementsMode"}
              onClick={() => onMenuClick("AnnouncementsMode")}
            >
              <NotificationAdd sx={{ mr: 1 }} />
              <ListItemText primary="Announcements" />
            </ListItemButton>

            <ListItemButton
              selected={selectedMode === "ConnectionsMode"}
              onClick={() => onMenuClick("ConnectionsMode")}
            >
              <Handshake sx={{ mr: 1 }} />
              <ListItemText primary="Connections" />
            </ListItemButton>

            <ListItemButton
              selected={selectedMode === "UsersMode2"}
              onClick={() => onMenuClick("UsersMode2")}
            >
              <PeopleAltIcon sx={{ mr: 1 }} />
              <ListItemText primary="Users" />
            </ListItemButton>

            {canAccessIntegrations && (
              <ListItemButton
                selected={selectedMode === "IntegrationsMode"}
                onClick={() => onMenuClick("IntegrationsMode")}
              >
                <ExtensionIcon className="menu-icon" />
                <ListItemText primary="Integrations" />
              </ListItemButton>
            )}

            {canAccessBilling && (
              <ListItemButton onClick={() => navigate("/billing")}>
                <ReceiptLongIcon className="menu-icon" />
                <ListItemText primary="Billing" />
              </ListItemButton>
            )}
          </Box>
        )}

        {showDistributorAdminTools && (
          <Box className="menu-section-admin">
            <Typography variant="subtitle1" className="menu-section-title">
              Admin
            </Typography>

            <ListItemButton
              selected={selectedMode === "AnnouncementsMode"}
              onClick={() => onMenuClick("AnnouncementsMode")}
            >
              <NotificationAdd sx={{ mr: 1 }} />
              <ListItemText primary="Announcements" />
            </ListItemButton>

            <ListItemButton
              selected={selectedMode === "ConnectionsMode"}
              onClick={() => onMenuClick("ConnectionsMode")}
            >
              <Handshake sx={{ mr: 1 }} />
              <ListItemText primary="Connections" />
            </ListItemButton>

            <ListItemButton
              selected={selectedMode === "TeamMode"}
              onClick={() => onMenuClick("TeamMode")}
            >
              <GroupIcon sx={{ mr: 1 }} />
              <ListItemText primary="Teams" />
            </ListItemButton>

            <ListItemButton
              selected={selectedMode === "AccountsMode"}
              onClick={() => onMenuClick("AccountsMode")}
            >
              <StoreIcon sx={{ mr: 1 }} />
              <ListItemText
                primary={`Accounts ${
                  pendingImports?.length ? `(${pendingImports.length})` : ""
                }`}
              />
            </ListItemButton>

            <ListItemButton
              selected={selectedMode === "ProductsMode"}
              onClick={() => onMenuClick("ProductsMode")}
            >
              <Inventory2 sx={{ mr: 1 }} />
              <ListItemText primary="Products" />
            </ListItemButton>

            <ListItemButton
              selected={selectedMode === "UsersMode2"}
              onClick={() => onMenuClick("UsersMode2")}
            >
              <PeopleAltIcon sx={{ mr: 1 }} />
              <ListItemText primary="Users" />
            </ListItemButton>

            <ListItemButton
              selected={selectedMode === "GoalManagerMode"}
              onClick={() => onMenuClick("GoalManagerMode")}
            >
              <GoalIcon />
              <ListItemText primary="Goals Manager" />
            </ListItemButton>

            {canAccessIntegrations && (
              <ListItemButton
                selected={selectedMode === "IntegrationsMode"}
                onClick={() => onMenuClick("IntegrationsMode")}
              >
                <ExtensionIcon className="menu-icon" />
                <ListItemText primary="Integrations" />
              </ListItemButton>
            )}

            {canAccessBilling && (
              <ListItemButton onClick={() => navigate("/billing")}>
                <ReceiptLongIcon className="menu-icon" />
                <ListItemText primary="Billing" />
              </ListItemButton>
            )}
          </Box>
        )}

        {/* {showUpgradeBanner && <UpgradePromptBanner />} */}

        <ListItem>
          <LogOutButton />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default DashMenu;
