import { useSelector } from 'react-redux';
import { selectUser } from '../Slices/userSlice';
import useFetchCompaniesWithUsers from '../hooks/useFetchCompaniesWithUsers';
import UserList from './UserList';
import { useNavigate } from 'react-router-dom';
import './developerDashboard.css';
import { DeveloperDashboardHelmet } from '../utils/helmetConfigurations';
import { deleteUserAuthAndFirestore, updateSelectedUser } from '../DeveloperAdminFunctions/developerAdminFunctions';
import { UserType } from '../utils/types';

const DeveloperDashboard = () => {
  const dashboardUser = useSelector(selectUser);
  const { companies, loading, error } = useFetchCompaniesWithUsers(dashboardUser?.role);
  const navigate = useNavigate();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const handleDeleteUser = async (userId: string) => {
    // Call deleteUser function here
    deleteUserAuthAndFirestore(userId);
  };

  const handleEditUser = async (adminId: string, user: UserType) => {
    // Call updateUser function here
    updateSelectedUser(adminId, user);
  };

  return (
    <div className="developer-dashboard-container">
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
    </div>
  );
};

export default DeveloperDashboard;


