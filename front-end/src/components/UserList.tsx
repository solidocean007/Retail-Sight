import React, { useEffect, useState } from 'react';
import { UserType } from '../utils/types';
import './userList.css';
import { fetchUserFromFirebase } from '../utils/userData/fetchUserFromFirebase';

interface UserListProps {
  users: UserType[];
  onEdit: (userId: string, updatedUser: UserType) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
}

const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete }) => {
  const [editedUsers, setEditedUsers] = useState<{ [key: string]: UserType }>({});

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await Promise.all(
        users.map(async user => {
          const userDetails = await fetchUserFromFirebase(user.uid);
          return { ...user, ...userDetails };
        })
      );
      const usersMap = fetchedUsers.reduce((acc, user) => ({ ...acc, [user.uid]: user }), {});
      setEditedUsers(usersMap);
    };

    fetchUsers();
  }, [users]);

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
          {Object.values(editedUsers).map(user => (
            <tr key={user.uid}>
              <td>
                <input type="text" value={user.firstName} onChange={e => handleEditChange(user.uid, 'firstName', e.target.value)} />
                <input type="text" value={user.lastName} onChange={e => handleEditChange(user.uid, 'lastName', e.target.value)} />
              </td>
              <td>
                <input type="email" value={user.email} onChange={e => handleEditChange(user.uid, 'email', e.target.value)} />
              </td>
              <td>
                <input type="tel" value={user.phone ?? ''} onChange={e => handleEditChange(user.uid, 'phone', e.target.value)} />
              </td>
              <td>
                <select value={user.role} onChange={e => handleEditChange(user.uid, 'role', e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                  <option value="super-admin">Super Admin</option>
                  <option value="status-pending">Status Pending</option>
                </select>
              </td>
              <td>
                <button onClick={() => onEdit(user.uid, editedUsers[user.uid])}>Save</button>
                <button onClick={() => onDelete(user.uid)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;

