import {
  Box,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { UserType } from "../utils/types";
import { collection, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSelector } from "react-redux";
import { selectUser, setCompanyUsers } from "../Slices/userSlice";
import { getCompanyUsersFromIndexedDB, saveCompanyUsersToIndexedDB, updateUserRoleInIndexedDB } from "../utils/database/userDataIndexedDB";

interface EmployeesViewerProps {
  localUsers: UserType[];
  setLocalUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
}

const EmployeesViewer: React.FC<EmployeesViewerProps> = ({ localUsers, setLocalUsers }) => {
  const currentUser = useSelector(selectUser);
  const companyId = currentUser?.companyId;
  const isSuperAdmin = currentUser?.role === "super-admin";

  const [editedUsers, setEditedUsers] = useState<{ [key: string]: UserType }>({});
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!companyId) return;

    const fetchData = async () => {
      const cachedUsers = await getCompanyUsersFromIndexedDB();
      if (cachedUsers) {
        setLocalUsers(cachedUsers);
      }

      const q = query(collection(db, "users"), where("companyId", "==", companyId));
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const usersFromFirestore = snapshot.docs.map(
          (doc) => ({ ...doc.data(), uid: doc.id } as UserType)
        );
        setLocalUsers(usersFromFirestore);
        await saveCompanyUsersToIndexedDB(usersFromFirestore);
      });

      return () => unsubscribe();
    };

    fetchData();
  }, [companyId]);

  const handleEditToggle = (userId: string) => {
    setEditMode((prev) => ({ ...prev, [userId]: !prev[userId] }));
    const userToEdit = localUsers.find((user) => user.uid === userId);
    if (userToEdit) {
      setEditedUsers((prev) => ({
        ...prev,
        [userId]: { ...userToEdit },
      }));
    }
  };

  const handleEditChange = (userId: string, field: keyof UserType, value: string) => {
    setEditedUsers((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSubmitEdit = async (userId: string) => {
    const updatedUser = editedUsers[userId];
    if (!updatedUser) return;

    try {
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, { salesRouteNum: updatedUser.salesRouteNum, role: updatedUser.role }, { merge: true });

      const updatedUsersList = localUsers.map((user) =>
        user.uid === userId ? updatedUser : user
      );
      setLocalUsers(updatedUsersList);
      await updateUserRoleInIndexedDB(userId, updatedUser.role);

      handleEditToggle(userId);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  return (
    <Container disableGutters>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Sales Route Number</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localUsers.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>
                  {editMode[user.uid] ? (
                    <TextField
                      value={editedUsers[user.uid]?.salesRouteNum ?? ""}
                      onChange={(e) =>
                        handleEditChange(user.uid, "salesRouteNum", e.target.value)
                      }
                      sx={{ width: "150px" }} // Adjust width as necessary
                    />
                  ) : (
                    user.salesRouteNum ?? "N/A"
                  )}
                </TableCell>
                <TableCell>
                  {editMode[user.uid] && isSuperAdmin ? (
                    <Select
                      value={editedUsers[user.uid]?.role ?? ""}
                      onChange={(e) =>
                        handleEditChange(user.uid, "role", e.target.value)
                      }
                      sx={{ width: "150px" }} // Adjust width as necessary
                    >
                      <MenuItem value="admin">Admin</MenuItem>
                      <MenuItem value="employee">Employee</MenuItem>
                      <MenuItem value="super-admin">Super Admin</MenuItem>
                      <MenuItem value="developer">Developer</MenuItem>
                      <MenuItem value="status-pending">Status Pending</MenuItem>
                    </Select>
                  ) : (
                    user.role
                  )}
                </TableCell>
                <TableCell>
                  {editMode[user.uid] ? (
                    <>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleSubmitEdit(user.uid)}
                      >
                        Submit
                      </Button>
                      <Button
                        variant="text"
                        color="secondary"
                        onClick={() => handleEditToggle(user.uid)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="text"
                      color="primary"
                      onClick={() => handleEditToggle(user.uid)}
                    >
                      Edit
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default EmployeesViewer;


