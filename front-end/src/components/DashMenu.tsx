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
import FlagIcon from "@mui/icons-material/Flag";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import SchoolIcon from "@mui/icons-material/School";
import GroupIcon from "@mui/icons-material/Group";
import StoreIcon from "@mui/icons-material/Store";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import SettingsIcon from "@mui/icons-material/Settings";
import TrackChangesIcon from "@mui/icons-material/TrackChanges";

import { useNavigate } from "react-router-dom";
import LogOutButton from "./LogOutButton";
import "./dashMenu.css";
import { DashboardModeType } from "../utils/types";
import { Handshake, Inventory2 } from "@mui/icons-material";
import UpgradePromptBanner from "./UpgradePromptBanner";
import { useSelector } from "react-redux";

const drawerWidth = 240;

const DashMenu = ({
  open,
  onClose,
  variant,
  onMenuClick,
  isEmployee,
  selectedMode,
}: {
  open: boolean;
  onClose: () => void;
  variant: "temporary" | "permanent";
  onMenuClick: (mode: DashboardModeType) => void;
  isEmployee: boolean;
  selectedMode: DashboardModeType;
}) => {
  const navigate = useNavigate();

  const role = useSelector((state: any) => state.user.role);
  const companyPlan = useSelector(
    (state: any) => state.currentCompany?.billing?.plan
  );
  const connectionCount = useSelector(
    (state: any) => state.currentCompany?.connectionCount
  );

  // Example condition: show banner if company is free or near limit
  const showUpgradeBanner =
    (role === "admin" || role === "super-admin") &&
    (companyPlan === "free" || connectionCount >= 3);

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
          backgroundColor: "var(--drawer-background)", // ✅ themed
          color: "var(--text-color)",
        },
      }}
    >
      <List>
        <ListItemButton onClick={() => navigate("/user-home-page")}>
          <HomeIcon sx={{ mr: 1 }} />
          <ListItemText primary="Home" />
        </ListItemButton>
        <ListItemButton
          selected={selectedMode === "MyGoalsMode"}
          onClick={() => onMenuClick("MyGoalsMode")}
        >
          <TrackChangesIcon sx={{ mr: 1 }} />
          <ListItemText primary="My Goals" />
        </ListItemButton>

        <ListItemButton
          selected={selectedMode === "ProfileMode"}
          onClick={() => onMenuClick("ProfileMode")}
        >
          <AccountCircleIcon sx={{ mr: 1 }} />
          <ListItemText primary="Profile" />
        </ListItemButton>
        <ListItemButton
          selected={selectedMode === "MyAccountsMode"}
          onClick={() => onMenuClick("MyAccountsMode")}
        >
          <StoreIcon sx={{ mr: 1 }} />
          <ListItemText primary="MyAccounts" />
        </ListItemButton>
        <ListItemButton
          selected={selectedMode === "CollectionsMode"}
          onClick={() => onMenuClick("CollectionsMode")}
        >
          <CollectionsBookmarkIcon sx={{ mr: 1 }} />
          <ListItemText primary="Collections" />
        </ListItemButton>
        <ListItemButton
          selected={selectedMode === "TutorialMode"}
          onClick={() => onMenuClick("TutorialMode")}
        >
          <SchoolIcon sx={{ mr: 1 }} />
          <ListItemText primary="Tutorial" />
        </ListItemButton>

        <Box className={`menu-section-admin ${isEmployee ? "disabled" : ""}`}>
          <Typography variant="subtitle1" className="menu-section-title">
            Admin
          </Typography>
          {/* <UpgradePromptBanner
            // show={showUpgradeBanner}
            show={true}
            message="You’re nearing your current plan limits."
            highlight="Upgrade now to keep growing your network."
          /> */}
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
            <ListItemText primary="Accounts" />
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
            <SettingsIcon sx={{ mr: 1 }} />
            <ListItemText primary="Goal Manager" />
          </ListItemButton>
        </Box>

        <ListItem>
          <LogOutButton />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default DashMenu;
