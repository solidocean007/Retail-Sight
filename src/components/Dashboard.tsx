// Dashboard.tsx
// import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import './dashboard.css';
import { RootState } from '../utils/store';

// Assuming 'state.user.currentUser' has a 'role' property.
// If not, you'll need to add this to your user reducer state.
export const Dashboard = () => {
  const user = useSelector((state : RootState) => state.user.currentUser);
  const navigate = useNavigate();

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isAdmin = user?.role === 'admin'; // This will be used once roles are implemented

  return (
    <div className="dashboard">
      <h3>Dashboard</h3>
      {`${user?.firstName} ${user?.lastName}`} 
      {`Role: ${user?.role} `} 
      {/* Render Add Users button if user is an admin */}
      {isAdmin && <button>Add Users</button>}

      {/* Home Button */}
      <button onClick={() => navigate('/')}>Home</button>
      
      {/* Additional dashboard components */}
      {/* More conditional content can be added here based on the user's role */}
    </div>
  );
};
 
export default Dashboard;
