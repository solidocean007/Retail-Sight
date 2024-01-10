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

// Assuming 'state.user.currentUser' has a 'role' property.
// If not, you'll need to add this to your user reducer state.
export const Dashboard = () => {
  const user = useSelector(selectUser);
  console.log("user: ", user);
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  console.log("companyId: ", companyId);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const companyUsers = useSelector(selectCompanyUsers);

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isAdmin = user?.role === "admin"; // This will be used once roles are implemented

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

  console.log(localUsers, ": local users");
  return (
    <div className="dashboard">
      <h3>Dashboard</h3>
      <div className="dashboard-user-details">
        {`${user?.firstName} ${user?.lastName} `}
        {`role: ${user?.role} `}
      </div>
      <div className="dashboard-add-user-button">
        {isAdmin && <button>Add Users</button>}
      </div>
      <div className="dashboard-exit-button">
        <button onClick={() => navigate("/")}>Home</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone Number</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {localUsers.map((localUser) => (
            <tr key={localUser.uid}>
              <td>{`${localUser.firstName} ${localUser.lastName}`}</td>
              <td>{localUser.email}</td>
              <td>{localUser.phone}</td>
              <td>
                {isAdmin ? (
                  <select
                    value={localUser.role}
                    onChange={
                      (e) => handleRoleChange(localUser.uid, e.target.value) // Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
                      // Type 'undefined' is not assignable to type 'string'.ts(2345)
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
