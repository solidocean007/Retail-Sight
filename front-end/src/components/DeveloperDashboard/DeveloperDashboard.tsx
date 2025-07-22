import { useState } from "react";
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
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { selectUser } from "../../Slices/userSlice";
import useFetchCompaniesWithUsers from "../../hooks/useFetchCompaniesWithUsers";
import UserList from "./../UserList";
import GenerateApiKeyComponent from "./../ApiKeyLogic/ApiKeyModal";
import { DeveloperDashboardHelmet } from "../../utils/helmetConfigurations";
import {
  deleteUserAuthAndFirestore,
  updateSelectedUser,
} from "../../DeveloperAdminFunctions/developerAdminFunctions";
import { UserType } from "../../utils/types";
// import "./developerDashboard.css";
import NotificationsTable from "../Notifications/NotificationsTable";

const DeveloperDashboard = () => {
  const navigate = useNavigate();
  const dashboardUser = useSelector(selectUser);
  const isDeveloper = dashboardUser?.role === "developer";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const { companies, loading, error } = useFetchCompaniesWithUsers(
    dashboardUser?.role
  );

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleDeleteUser = async (userId: string) => {
    await deleteUserAuthAndFirestore(userId);
  };

  const handleEditUser = async (adminId: string, user: UserType) => {
    await updateSelectedUser(adminId, user);
  };

  if (loading) return <CircularProgress />;
  // if (error) return <div>Error: {error.message}</div>;

  return (
    <Container className="developer-dashboard-container" sx={{ display: 'flex', flexDirection: 'column'}}>
      <DeveloperDashboardHelmet />
      <header className="developer-dashboard-header">
        <h2>Developer Dashboard</h2>
        <p>{`${dashboardUser?.firstName} ${dashboardUser?.lastName} | Role: ${dashboardUser?.role}`}</p>
        <div className="dashboard-header-actions">
          <Button variant="outlined" onClick={() => navigate("/")}>Home</Button>
          {isDeveloper && (
            <Button variant="contained" onClick={handleOpenModal}>
              API Key
            </Button>
          )}
        </div>
      </header>

      <Tabs
        value={tabIndex}
        onChange={(_, newIndex) => setTabIndex(newIndex)}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        className="developer-dashboard-tabs"
      >
        <Tab label="Users" />
        <Tab label="Notifications" />
        <Tab label="API Keys" />
      </Tabs>

      <Box className="developer-dashboard-content">
        {tabIndex === 0 && (
          <section className="user-management-section">
            {companies.map((company) => (
              <Accordion key={company.id}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">{company.companyName}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <UserList
                    users={company.superAdminDetails}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                  />
                  <UserList
                    users={company.adminDetails}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                  />
                  <UserList
                    users={company.employeeDetails}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                  />
                  <UserList
                    users={company.pendingDetails}
                    onEdit={handleEditUser}
                    onDelete={handleDeleteUser}
                  />
                </AccordionDetails>
              </Accordion>
            ))}
          </section>
        )}

        {tabIndex === 1 && (
          <section className="notifications-section">
            <h3>Notifications</h3>
            <p>Here you can send and manage notifications.</p>
            <NotificationsTable />
            {/* 📣 We’ll add NotificationTable and NotificationForm components here later */}
          </section>
        )}

        {tabIndex === 2 && (
          <section className="api-keys-section">
            <h3>API Keys</h3>
            <p>Manage API keys for company integrations.</p>
            <Button variant="contained" onClick={handleOpenModal}>
              Generate API Key
            </Button>
          </section>
        )}
      </Box>

      <GenerateApiKeyComponent open={isModalOpen} onClose={handleCloseModal} />
    </Container>
  );
};

export default DeveloperDashboard;