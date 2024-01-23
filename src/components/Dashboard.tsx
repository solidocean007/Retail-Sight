// Dashboard.tsx
// import React from 'react';
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { useEffect, useState } from "react";
import { selectCompanyUsers, selectUser } from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
  updateUserRoleInIndexedDB,
} from "../utils/database/userDataIndexedDB";
import { fetchCompanyUsers } from "../thunks/usersThunks";
import { UserType } from "../utils/types";
import { RootState, useAppDispatch } from "../utils/store";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import "./dashboard.css";

export const Dashboard = () => {
  const user = useSelector(selectUser);
  console.log("user: ", user);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const companyUsers = useSelector(selectCompanyUsers);

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";
  const isSuperAdmin = user?.role === "super-admin";

  useEffect(() => {
    const fetchAndStoreUsers = async () => {
      if (companyId) {
        const indexedDBUsers = await getCompanyUsersFromIndexedDB();
        if (indexedDBUsers && indexedDBUsers.length > 0) {
          setLocalUsers(indexedDBUsers);
        } else {
          dispatch(fetchCompanyUsers(companyId)).then((users) => {
            if (Array.isArray(users.payload)) {
              saveCompanyUsersToIndexedDB(users.payload);
              setLocalUsers(users.payload);
            }
          });
        }
      }
    };

    fetchAndStoreUsers();
  }, [companyId, dispatch]);

  useEffect(() => {
    // Update localUsers whenever companyUsers in Redux changes
    setLocalUsers(companyUsers);
  }, [companyUsers]);

  // Type guard function to check if a string is a valid role
  function isValidRole(role: string): role is UserType["role"] {
    return ["admin", "employee", "status-pending", "developer"].includes(role);
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Ensure only super-admin can change roles, and admins cannot change their own role
    if (!isSuperAdmin || (isAdmin && user?.uid === userId)) {
      console.error("You do not have permission to change this role.");
      return;
    }

    if (!isValidRole(newRole)) {
      console.error("Invalid role");
      return;
    }

    try {
      // Update Firestore
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, { role: newRole }, { merge: true });

      // Update local state
      const updatedUsers = localUsers.map((user) =>
        user.uid === userId ? { ...user, role: newRole } : user
      );
      setLocalUsers(updatedUsers);

      // Update IndexedDB
      updateUserRoleInIndexedDB(userId, newRole);
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        {/* Sidebar with navigation links */}
        {/* ... */}
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-top">
            <h1>Dashboard</h1>

            <button
              className="home-btn"
              onClick={() => navigate("/user-home-page")}
            >
              Home
            </button>
          </div>
          {/* Top bar with user info and controls */}
          <div className="dashboard-user-details">
            <p>{`${user?.firstName} ${user?.lastName} Role: ${user?.role}`}</p>

            <p>Adding users here is under development</p>
          </div>
          <div className="dashboard-controls">
            {(isSuperAdmin || isDeveloper || isAdmin) && (
              <button className="add-user-btn">Add Users</button>
            )}
          </div>
        </header>

        <section className="dashboard-content">
          <div className="card role-management-card">
            <div className="header-and-all-info">
              
                <div className="table-header">
                  <div className="user-detail">Name</div>
                  <div className="user-detail">Email</div>
                  <div className="user-detail">Phone Number</div>
                  <div className="user-detail">Role</div>
                </div>
              
              <div>
                {localUsers.map((localUser) => (
                  <div className="all-user-info" key={localUser.uid}>
                    <div className="user-detail">{`${localUser.firstName} ${localUser.lastName}`}</div>
                    <div className="user-detail">{localUser.email}</div>
                    <div className="user-detail">{localUser.phone}</div>
                    <div className="user-detail">
                      {isSuperAdmin && localUser.uid !== user?.uid ? (
                        <select
                          title="role-select"
                          value={localUser.role}
                          onChange={(e) =>
                            handleRoleChange(localUser.uid!, e.target.value)
                          }
                        >
                          {/* List all possible roles here */}
                          <option value="admin">Admin</option>
                          <option value="employee">Employee</option>
                          {/* Other roles */}
                        </select>
                      ) : (
                        <span>{localUser.role}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional cards for other dashboard content */}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
