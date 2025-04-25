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
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { UserType } from "../utils/types";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
import { updateUserRoleInIndexedDB } from "../utils/database/userDataIndexedDB";
import PendingInvites from "./PendingInvites";
import { getFunctions, httpsCallable } from "@firebase/functions";

interface EmployeesViewerProps {
  localUsers: UserType[];
  setLocalUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
}

const EmployeesViewer: React.FC<EmployeesViewerProps> = ({ localUsers, setLocalUsers }) => {
  const currentUser = useSelector(selectUser);
  const isSuperAdmin = currentUser?.role === "super-admin";
  const isAdmin = currentUser?.role === "admin";
  const isDeveloper = currentUser?.role === "developer";

  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [editedUsers, setEditedUsers] = useState<{ [key: string]: UserType }>({});
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});

  const sortedUsers = [...localUsers].sort((a, b) => {
    const lastCompare = a.lastName.localeCompare(b.lastName);
    return lastCompare !== 0 ? lastCompare : a.firstName.localeCompare(b.firstName);
  });

  const toggleInvites = () => setShowPendingInvites((prev) => !prev);

  const handleEditToggle = (userId: string) => {
    setEditMode((prev) => ({ ...prev, [userId]: !prev[userId] }));
    const userToEdit = localUsers.find((user) => user.uid === userId);
    if (userToEdit) {
      setEditedUsers((prev) => ({ ...prev, [userId]: { ...userToEdit } }));
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentUser) return setFeedbackMessage("Missing email or user context");

    const functions = getFunctions();
    const inviteFunction = httpsCallable(functions, "sendInvite");
    const inviteDocRef = doc(collection(db, "invites"));
    const timestamp = new Date().toISOString();
    const inviteLink = `${window.location.origin}/sign-up-login?companyName=${encodeURIComponent(currentUser.company)}&email=${encodeURIComponent(inviteEmail)}&mode=signup`;

    try {
      await inviteFunction({ email: inviteEmail, inviter: `${currentUser.firstName} ${currentUser.lastName}`, inviteLink });
      await setDoc(inviteDocRef, {
        companyId: currentUser.companyId,
        email: inviteEmail,
        inviter: `${currentUser.firstName} ${currentUser.lastName}`,
        link: inviteLink,
        status: "pending",
        timestamp,
      });
      setFeedbackMessage("Invite sent successfully!");
      setInviteEmail("");
    } catch (error) {
      console.error("Invite error:", error);
      setFeedbackMessage("Error sending invite.");
    }
  };

  const handleEditChange = (userId: string, field: keyof UserType, value: string) => {
    setEditedUsers((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  const handleSubmitEdit = async (userId: string) => {
    const updatedUser = editedUsers[userId];
    if (!updatedUser) return;

    try {
      await setDoc(doc(db, "users", userId), {
        salesRouteNum: updatedUser.salesRouteNum,
        role: updatedUser.role,
      }, { merge: true });

      const updatedUsers = localUsers.map((u) => u.uid === userId ? updatedUser : u);
      setLocalUsers(updatedUsers);
      await updateUserRoleInIndexedDB(userId, updatedUser.role);
      handleEditToggle(userId);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  return (
    <Container disableGutters>
      {(isAdmin || isDeveloper || isSuperAdmin) && (
        <Box my={2}>
          <Button variant="contained" onClick={toggleInvites}>
            {showPendingInvites ? "Hide Pending Invites" : "Show Pending Invites"}
          </Button>
          {showPendingInvites && (
            <Box mt={2}>
              <form onSubmit={handleInviteSubmit} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <TextField
                  label="Employee Email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  size="small"
                />
                <Button type="submit" variant="contained" color="primary">
                  Send Invite
                </Button>
              </form>
              {feedbackMessage && <Typography color="secondary" variant="body2">{feedbackMessage}</Typography>}
              <PendingInvites />
            </Box>
          )}
        </Box>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: "var(--card-radius)", boxShadow: "var(--card-shadow)" }}>
        <Table className="mui-themed-table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Sales Route #</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow key={user.uid}>
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>
                  {editMode[user.uid] ? (
                    <TextField
                      value={editedUsers[user.uid]?.salesRouteNum ?? ""}
                      onChange={(e) => handleEditChange(user.uid, "salesRouteNum", e.target.value)}
                      size="small"
                      sx={{ width: "clamp(120px, 20vw, 200px)" }} // Or 100%, or a responsive value
                    />
                  ) : (
                    user.salesRouteNum || "N/A"
                  )}
                </TableCell>
                <TableCell>
                  {editMode[user.uid] && isSuperAdmin ? (
                    <Select
                      value={editedUsers[user.uid]?.role ?? ""}
                      onChange={(e) => handleEditChange(user.uid, "role", e.target.value)}
                      size="small"
                      sx={{ width: "clamp(120px, 20vw, 200px)" }}
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
                      <Button variant="contained" size="small" onClick={() => handleSubmitEdit(user.uid)}>
                        Save
                      </Button>
                      <Button variant="text" size="small" onClick={() => handleEditToggle(user.uid)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button variant="text" size="small" onClick={() => handleEditToggle(user.uid)}>
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