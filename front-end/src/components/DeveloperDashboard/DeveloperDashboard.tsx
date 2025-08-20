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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { selectUser } from "../../Slices/userSlice";
import {
  fetchCompaniesWithUsers,
  selectCompaniesLoading,
  selectCompaniesWithUsers,
} from "../../Slices/allCompaniesSlice";
import { useAppDispatch } from "../../utils/store";

import UserList from "../UserList";
import GenerateApiKeyComponent from "../ApiKeyLogic/ApiKeyModal";
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
import CompanyOnboardingAdmin from "./CompanyOnboardingAdmin";

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const dashboardUser = useSelector(selectUser);
  const isDeveloper = dashboardUser?.role === "developer";

  const dispatch = useAppDispatch();
  const allCompaniesAndUsers = useSelector(selectCompaniesWithUsers);
  const loading = useSelector(selectCompaniesLoading);

  const [tabIndex, setTabIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Ask for confirmation before deleting user
  const askDelete = (uid: string): Promise<void> => {
    setTargetUserId(uid);
    setConfirmOpen(true);
    return Promise.resolve(); // 👈 resolves immediately
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

  const handleEditUser = async (adminId: string, user: UserType) =>
    updateSelectedUser(adminId, user);

  useEffect(() => {
    if (!allCompaniesAndUsers.length && !loading) {
      dispatch(fetchCompaniesWithUsers());
    }
  }, [allCompaniesAndUsers.length, loading, dispatch]);

  const handleRefresh = () => dispatch(fetchCompaniesWithUsers());
  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  return (
    <Container sx={{ display: "flex", flexDirection: "column" }}>
      <DeveloperDashboardHelmet />

      {/* ─────────────────── HEADER ─────────────────── */}
      <header>
        <Typography variant="h4">Developer Dashboard</Typography>
        <Typography variant="subtitle2">
          {dashboardUser?.firstName} {dashboardUser?.lastName} — Role:{" "}
          {dashboardUser?.role} uid: {dashboardUser?.uid}
        </Typography>
        <LogOutButton />

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={() => navigate("/")}>
            Home
          </Button>

          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={loading}
            startIcon={loading && <CircularProgress size={16} />}
          >
            Refresh
          </Button>

          {isDeveloper && (
            <Button variant="contained" onClick={handleOpenModal}>
              API Key
            </Button>
          )}
        </Stack>
      </header>

      {/* ─────────────────── LOADING STATE ─────────────────── */}
      {loading && !allCompaniesAndUsers.length ? (
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
            <Tab label="Company Manager" />
            <Tab label="Users" />
            <Tab label="Notifications" />
            <Tab label="API Keys" />
          </Tabs>

          {/* ─────────────────── TAB CONTENT ─────────────────── */}
          <Box sx={{ mt: 2 }}>
            {tabIndex === 0 && (
              <>
                <CompanyOnboardingAdmin />
              </>
            )}
            {tabIndex === 1 && (
              <>
                {allCompaniesAndUsers.map((company) => (
                  <Accordion key={company.id}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="h6">
                        {company.companyName}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {[
                        "superAdminDetails",
                        "adminDetails",
                        "employeeDetails",
                        "pendingDetails",
                      ].map((key) => (
                        <UserList
                          key={key}
                          users={
                            company[key as keyof typeof company] as UserType[]
                          }
                          onDelete={askDelete} // Type '(uid: string) => void' is not assignable to type '(userId: string) => Promise<void>'.
                          // Type 'void' is not assignable to type 'Promise<void>'.
                          onEdit={handleEditUser}
                        />
                      ))}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </>
            )}

            {tabIndex === 2 && (
              <Box>
                <Typography variant="h6" mb={1}>
                  Notifications
                </Typography>
                {/* Abstracted Notification Form with Audience Picker */}
                <DeveloperNotificationForm
                  // isDeveloper={dashboardUser?.role === "developer"}
                  currentUser={dashboardUser as UserType}
                  allCompaniesAndUsers={allCompaniesAndUsers}
                />
                <DeveloperNotificationsTable allCompaniesAndUsers={allCompaniesAndUsers} />
              </Box>
            )}

            {tabIndex === 3 && (
              <Box>
                <Typography variant="h6" mb={1}>
                  API Keys
                </Typography>
                <Button variant="contained" onClick={handleOpenModal}>
                  Generate API Key
                </Button>
              </Box>
            )}
          </Box>
        </>
      )}

      {/* <GenerateApiKeyComponent open={isModalOpen} onClose={handleCloseModal} /> */}
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
