import React, { useState } from 'react';
import { UserType } from '../utils/types';
import './userList.css';

interface UserListProps {
  users: UserType[];
  onEdit: (userId: string, updatedUser: UserType) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete }) => {
  // Local state to track changes to the users
  const [editedUsers, setEditedUsers] = useState<{ [key: string]: UserType }>({});

  // Handler for when any user detail is edited
  const handleEditChange = (userId: string, field: keyof UserType, value: string) => {
    setEditedUsers(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      }
    }));
  };

  return (
    <div className="user-list-container">
      <table className="user-list-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone Number</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            // Use existing user details as defaults
            const currentUserDetails = editedUsers[user.uid] || user;
            return (
              <tr key={user.uid}>
                <td>
                  <input
                    type="text"
                    defaultValue={user.firstName}
                    onBlur={(e) => handleEditChange(user.uid, 'firstName', e.target.value)}
                  />
                  <input
                    type="text"
                    defaultValue={user.lastName}
                    onBlur={(e) => handleEditChange(user.uid, 'lastName', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="email"
                    defaultValue={user.email}
                    onBlur={(e) => handleEditChange(user.uid, 'email', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="tel"
                    defaultValue={user.phone}
                    onBlur={(e) => handleEditChange(user.uid, 'phone', e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={currentUserDetails.role}
                    onChange={(e) => handleEditChange(user.uid, 'role', e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="employee">Employee</option>
                    <option value="super-admin">Super Admin</option>
                    <option value="status-pending">Status Pending</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => onEdit(user.uid, currentUserDetails)}>Save</button> 
                  <button onClick={() => onDelete(user.uid)}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;



