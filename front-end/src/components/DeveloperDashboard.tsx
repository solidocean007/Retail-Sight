import { useSelector } from 'react-redux';
import { selectUser } from '../Slices/userSlice';
import useFetchCompaniesWithUsers from '../hooks/useFetchCompaniesWithUsers';
import UserList from './UserList';
import { useNavigate } from 'react-router-dom';
import './developerDashboard.css';
import { DeveloperDashboardHelmet } from '../utils/helmetConfigurations';
import { deleteUserAuthAndFirestore, updateSelectedUser } from '../DeveloperAdminFunctions/developerAdminFunctions';
import { UserType } from '../utils/types';
import { Button, Container } from '@mui/material';
import { useState } from 'react';
import GenerateApiKeyComponent from './GenerateApiKey/GenerateApiKeyComponent';
// import GenerateApiKeyComponent from './GenerateApiKey/GenerateApiKeyComponent';

const DeveloperDashboard = () => {
  const dashboardUser = useSelector(selectUser);
  const isDeveloper = dashboardUser?.role === "developer";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { companies, loading, error } = useFetchCompaniesWithUsers(dashboardUser?.role);
  const navigate = useNavigate();

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleDeleteUser = async (userId: string) => {
    await deleteUserAuthAndFirestore(userId);
  };

  const handleEditUser = async (adminId: string, user: UserType) => {
    // Call updateUser function here
    await updateSelectedUser(adminId, user);
  };

  return (
    <Container className="developer-dashboard-container">
      <DeveloperDashboardHelmet />
      <aside className="developer-dashboard-sidebar">
        {/* Navigation links */}
      </aside>
      <main className="developer-dashboard-main">
        <header className="developer-dashboard-header">
          <div className="developer-dashboard-user-details">
            <h3>Developer Dashboard</h3>
            <p>{`${dashboardUser?.firstName} ${dashboardUser?.lastName} Role: ${dashboardUser?.role}`}</p>
          </div>
          <div className="dashboard-controls">
            <button className="add-user-btn">Add Users</button>
            <button className="home-btn" onClick={() => navigate("/")}>Home</button>
          </div>
          { isDeveloper && (
              <Button onClick={handleOpenModal} >Api key</Button>
            )}
        </header>
        <section className="developer-dashboard-content">
          {companies.map(company => (
            <div key={company.id} className="card">
              <h2>{company.companyName}</h2>
              <UserList users={company.superAdminDetails} onEdit={handleEditUser} onDelete={handleDeleteUser} />
              <UserList users={company.adminDetails} onEdit={handleEditUser} onDelete={handleDeleteUser} />
              <UserList users={company.employeeDetails} onEdit={handleEditUser} onDelete={handleDeleteUser} />
              <UserList users={company.pendingDetails} onEdit={handleEditUser} onDelete={handleDeleteUser} />
              {/* Additional UserList components for other roles */}
            </div>
          ))}
        </section>
      </main>
      <GenerateApiKeyComponent open={isModalOpen} onClose={handleCloseModal} />

    </Container>
  );
};

export default DeveloperDashboard;


