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
import { collection, doc, getDocs, query, setDoc, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useSelector } from "react-redux";
import {
  selectCompanyUsers,
  selectUser,
  setCompanyUsers,
} from "../Slices/userSlice";
import { updateUserRoleInIndexedDB } from "../utils/database/userDataIndexedDB";
import PendingInvites from "./PendingInvites";
import { getFunctions, httpsCallable } from "@firebase/functions";
import { useAppDispatch } from "../utils/store";
import CustomConfirmation from "./CustomConfirmation";

const EmployeesViewer = () => {
  const dispatch = useAppDispatch();
  const localUsers = useSelector(selectCompanyUsers) || [];
  const currentUser = useSelector(selectUser);
  const isSuperAdmin = currentUser?.role === "super-admin";
  const isEmployee = currentUser?.role === "employee";
  const isAdmin = currentUser?.role === "admin";
  const isDeveloper = currentUser?.role === "developer";

  const [inviteEmail, setInviteEmail] = useState<string>("");
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [editedUsers, setEditedUsers] = useState<{ [key: string]: UserType }>(
    {}
  );
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const sortedUsers: UserType[] = [...localUsers].sort((a, b) => {
    // Type 'UserType[] | null' must have a '[Symbol.iterator]()' method that returns an iterator.
    // give yourself a non-undefined string to compare
    const aLast = a.lastName ?? "";
    const bLast = b.lastName ?? "";

    const lastDiff = aLast.localeCompare(bLast);
    if (lastDiff !== 0) return lastDiff;

    // if last names tie, compare first names
    const aFirst = a.firstName ?? "";
    const bFirst = b.firstName ?? "";
    return aFirst.localeCompare(bFirst);
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

  const normalizedEmail = inviteEmail.toLowerCase().trim();

  if (!inviteEmail || !currentUser) {
    return setFeedbackMessage("Missing email or user context");
  }

  try {
    // 🔥 Check if a user already exists with this email
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", normalizedEmail));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      setFeedbackMessage(
        "A user with this email already exists. They can log in or reset their password."
      );
      return;
    }

    // 📤 Continue sending invite
    const functions = getFunctions();
    const inviteFunction = httpsCallable(functions, "sendInvite");
    const inviteDocRef = doc(collection(db, "invites"));
    const timestamp = new Date().toISOString();
    const inviteLink = `${
      window.location.origin
    }/sign-up-login?companyName=${encodeURIComponent(
      currentUser.company
    )}&email=${encodeURIComponent(normalizedEmail)}&mode=signup`;

    await inviteFunction({
      email: normalizedEmail,
      inviter: `${currentUser.firstName} ${currentUser.lastName}`,
      inviteLink,
    });

    await setDoc(inviteDocRef, {
      companyId: currentUser.companyId,
      email: normalizedEmail,
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


  const handleEditChange = (
    userId: string,
    field: keyof UserType,
    value: string
  ) => {
    setEditedUsers((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  const handleSubmitEdit = async (userId: string) => {
    const updatedUser = editedUsers[userId];
    if (!updatedUser) return;

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          salesRouteNum: updatedUser.salesRouteNum,
          role: updatedUser.role,
        },
        { merge: true }
      );

      const updatedUsers = localUsers.map(
        (
          u // 'localUsers' is possibly 'null'
        ) => (u.uid === userId ? updatedUser : u)
      );
      dispatch(setCompanyUsers(updatedUsers));
      await updateUserRoleInIndexedDB(userId, updatedUser.role);
      handleEditToggle(userId);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      // Soft-delete: Mark user as inactive
      await setDoc(
        doc(db, "users", userToDelete.uid),
        { status: "inactive" },
        { merge: true }
      );

      // Optionally remove from IndexedDB or local state
      const updatedUsers = localUsers.map((u) =>
        u.uid === userToDelete.uid
          ? { ...u, status: "inactive" as "inactive" }
          : u
      );
      dispatch(setCompanyUsers(updatedUsers));

      // Success feedback
      setFeedbackMessage(
        `${userToDelete.firstName} ${userToDelete.lastName} deactivated.`
      );
    } catch (err) {
      console.error("Failed to deactivate user:", err);
      setFeedbackMessage("Error deactivating user.");
    } finally {
      setDeleteLoading(false);
      setConfirmDeleteOpen(false);
      setUserToDelete(null);
    }
  };

  return (
    <Container disableGutters>
      {(isAdmin || isDeveloper || isSuperAdmin) && (
        <Box my={2}>
          <Button variant="contained" onClick={toggleInvites}>
            {showPendingInvites
              ? "Hide Pending Invites"
              : "Show Pending Invites"}
          </Button>
          {showPendingInvites && (
            <Box mt={2}>
              <form
                onSubmit={handleInviteSubmit}
                style={{ display: "flex", gap: "1rem", alignItems: "center" }}
              >
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
              {feedbackMessage && (
                <Typography color="secondary" variant="body2">
                  {feedbackMessage}
                </Typography>
              )}
              <PendingInvites />
            </Box>
          )}
        </Box>
      )}

      <TableContainer
        component={Paper}
        sx={{
          borderRadius: "var(--card-radius)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <Table className="mui-themed-table">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Sales Route #</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow
                key={user.uid}
                style={{
                  opacity: user.status === "inactive" ? 0.25 : 1,
                  textDecoration:
                    user.status === "inactive" ? "line-through" : "none",
                }}
              >
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>
                  {editMode[user.uid] ? (
                    <TextField
                      value={editedUsers[user.uid]?.salesRouteNum ?? ""}
                      onChange={(e) =>
                        handleEditChange(
                          user.uid,
                          "salesRouteNum",
                          e.target.value
                        )
                      }
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
                      onChange={(e) =>
                        handleEditChange(user.uid, "role", e.target.value)
                      }
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
                <TableCell>{user.status}</TableCell>

                <TableCell>
                  {editMode[user.uid] ? (
                    <>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleSubmitEdit(user.uid)}
                      >
                        Save
                      </Button>
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => handleEditToggle(user.uid)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleEditToggle(user.uid)}
                    >
                      Edit
                    </Button>
                  )}
                  <button
                    className="delete-btn"
                    onClick={() => {
                      setUserToDelete(user);
                      setConfirmDeleteOpen(true);
                    }}
                    disabled={isEmployee}
                  >
                    delete
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <CustomConfirmation
        isOpen={confirmDeleteOpen}
        message={`Are you sure you want to deactivate ${userToDelete?.firstName} ${userToDelete?.lastName}?`}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setConfirmDeleteOpen(false);
          setUserToDelete(null);
        }}
        loading={deleteLoading}
      />
    </Container>
  );
};

export default EmployeesViewer;
