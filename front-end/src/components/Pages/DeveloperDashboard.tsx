// DeveloperDashboard.tsx (Patched)
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Button,
  CircularProgress,
  Container,
  Tabs,
  Tab,
  Box,
  Typography,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { selectUser } from "../../Slices/userSlice";
import {
  fetchCompaniesWithUsers,
  selectCompaniesLoading,
} from "../../Slices/allCompaniesSlice";
import { useAppDispatch } from "../../utils/store";

import { DeveloperDashboardHelmet } from "../../utils/helmetConfigurations";
import {
  deleteUserAuthAndFirestore,
  updateSelectedUser,
} from "../../DeveloperAdminFunctions/developerAdminFunctions";
import { UserType } from "../../utils/types";
import CustomConfirmation from "../CustomConfirmation";
import LogOutButton from "../LogOutButton";
import DeveloperNotificationForm from "../Notifications/DeveloperNotificationForm";
import DeveloperNotificationsTable from "../Notifications/DeveloperNotificationsTable";
// import { CreateTestCompanyModal } from "../DeveloperDashboard/CreateTestCompanyModal";
// import { addDoc, collection } from "firebase/firestore";
// import { db } from "../../utils/firebase";
import { useAppConfigSync } from "../../hooks/useAppConfigSync";
import { resetApp } from "../../utils/resetApp";
import NotificationStatsCard from "../Notifications/NotificationsStatsCard";
import NotificationEngagementBreakdown from "../Notifications/NotificationEngagementBreakdown";
import { getFunctions, httpsCallable } from "firebase/functions";
import DeveloperOperations from "./DeveloperOperations";
import DeveloperMessaging from "./DeveloperMessaging";
import DeveloperPlatform from "./DeveloperPlatform";

// Next Upgrade (Optional)

// Instead of scanning collectionGroup every time:

// Add stats object to developerNotifications and increment counters inside:

// onUserNotificationCreated

// click tracking updates

// read updates

// Then analytics becomes a single doc read.

// But this version is perfectly fine for v1.

// You now officially have a real notification analytics system.

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const dashboardUser = useSelector(selectUser);
  const { localVersion, serverVersion } = useAppConfigSync();
  const upToDate = localVersion === serverVersion;

  const dispatch = useAppDispatch();
  const loading = useSelector(selectCompaniesLoading);

  const [tabIndex, setTabIndex] = useState(0);
  const [isCreateTestCompanyModalOpen, setIsCreateTestCompanyModalOpen] =
    useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleReset = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset the app? This will clear all stored data.",
      )
    ) {
      await resetApp(dispatch);
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetUserId) return;
    setDeleting(true);
    try {
      await deleteUserAuthAndFirestore(targetUserId);
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setTargetUserId(null);
    }
  };

  const handleRefresh = () => dispatch(fetchCompaniesWithUsers());
  // const handleCloseModal = () => setIsModalOpen(false);

  return (
    <Container sx={{ display: "flex", flexDirection: "column" }}>
      <DeveloperDashboardHelmet />
      {/* ─────────────────── HEADER ─────────────────── */}
      <header>
        <Typography variant="h4">Developer Dashboard</Typography>
        <Typography variant="subtitle2">
          {dashboardUser?.firstName} {dashboardUser?.lastName} — Role:{" "}
          {dashboardUser?.role}
        </Typography>
        <LogOutButton />

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => navigate("/")}>
            Home
          </Button>
          <button
            className="btn-outline danger-button"
            onClick={handleReset}
            // disabled={!upToDate}
          >
            {localVersion != serverVersion ? `Reset App` : `App is up to date`}
          </button>
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} />}
          >
            Refresh
          </Button>
        </Stack>
      </header>
      {/* ─────────────────── LOADING STATE ─────────────────── */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* ─────────────────── TABS ─────────────────── */}

          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
            sx={{ mt: 3 }}
          >
            <Tab label="Operations" />
            <Tab label="Messaging" />
            <Tab label="Platform" />
            <Tab label="Internal" />
          </Tabs>

          {/* ─────────────────── TAB CONTENT ─────────────────── */}
          <Box sx={{ mt: 2 }}>
            {tabIndex === 0 && <DeveloperOperations />}
            {tabIndex === 1 && (
              <>
                <DeveloperMessaging />
              </>
            )}
            {tabIndex === 2 && (
              <>
                <DeveloperPlatform />
              </>
            )}
          </Box>
        </>
      )}
      <CustomConfirmation
        isOpen={confirmOpen}
        message="Permanently delete this user? This can’t be undone."
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmOpen(false)}
        loading={deleting}
      />
    </Container>
  );
};

export default DeveloperDashboard;
