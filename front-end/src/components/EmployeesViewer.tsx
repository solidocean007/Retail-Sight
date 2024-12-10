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
import React, { useState } from "react";
import { UserType } from "../utils/types";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSelector } from "react-redux";
import { selectUser, } from "../Slices/userSlice";
import {  updateUserRoleInIndexedDB } from "../utils/database/userDataIndexedDB";
import PendingInvites from "./PendingInvites";
import { getFunctions, httpsCallable } from "@firebase/functions";

interface EmployeesViewerProps {
  localUsers: UserType[];
  setLocalUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
}

const EmployeesViewer: React.FC<EmployeesViewerProps> = ({ localUsers, setLocalUsers }) => {
  const currentUser = useSelector(selectUser);
  const companyId = currentUser?.companyId;
  const isSuperAdmin = currentUser?.role === "super-admin";
  const isAdmin = currentUser?.role === "admin";
  const isDeveloper = currentUser?.role === "developer";

  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [inviteLink, setInviteLink] = useState<string>("");
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [editedUsers, setEditedUsers] = useState<{ [key: string]: UserType }>({});
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const toggleInvites = () => {
    setShowPendingInvites((prev) => !prev);
  };

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

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!inviteEmail || !currentUser) {
      setFeedbackMessage("Email is required, or you are not authenticated.");
      return;
    }
    const functions = getFunctions();
    const inviteFunction = httpsCallable(functions, "sendInvite");
    const inviteDocRef = doc(collection(db, "invites")); // Generate a new document ID
    const timestamp = new Date().toISOString();
  
    try {
      const inviteLink = `${window.location.origin}/sign-up-login?companyName=${encodeURIComponent(
        currentUser.company
      )}&email=${encodeURIComponent(inviteEmail)}`;
  
      // Call the cloud function to send the email invite
      await inviteFunction({
        email: inviteEmail,
        inviter: `${currentUser.firstName} ${currentUser.lastName}`,
        inviteLink,
      });
  
      // Write to Firestore to track the invite
      await setDoc(inviteDocRef, {
        companyId: currentUser.companyId,
        email: inviteEmail,
        inviter: `${currentUser.firstName} ${currentUser.lastName}`,
        link: inviteLink,
        status: "pending", // Initial status
        timestamp,
      });
  
      setFeedbackMessage("Invite sent and tracked successfully!");
      setInviteEmail(""); // Reset the email field
    } catch (error) {
      console.error("Error sending or tracking invite:", error);
      setFeedbackMessage("Failed to send or track the invite. Please try again.");
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
      <Box>
      {(isAdmin || isDeveloper || isSuperAdmin) && (
          <section className="invite-section">
            <button className="button-blue" onClick={toggleInvites}>
              {showPendingInvites ? "Hide pending" : "Show Pending Invites"}
            </button>

            {showPendingInvites && (
              <div className="all-pending-invites">
                <form className="invite-form" onSubmit={handleInviteSubmit}>
                  <div className="invite-title">
                    <label htmlFor="inviteEmail">Invite Employee:</label>
                  </div>
                  <div className="invite-input-box">
                    <input
                      type="email"
                      id="inviteEmail"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter employee's email"
                      required
                    />
                    <button type="submit">Send Invite</button>
                  </div>
                </form>
                <PendingInvites />
              </div>
            )}
          </section>
        )}
      </Box>
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


