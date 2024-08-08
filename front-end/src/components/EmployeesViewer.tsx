import { Box, Container } from "@mui/material";
import React, { useEffect, useState } from "react";
import { UserType } from "../utils/types";
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { RootState, useAppDispatch } from "../utils/store";
import {
  saveCompanyUsersToIndexedDB,
  updateUserRoleInIndexedDB,
} from "../utils/database/userDataIndexedDB";
import {
  selectCompanyUsers,
  selectUser,
  setCompanyUsers,
} from "../Slices/userSlice";
import { useSelector } from "react-redux";
import PendingInvites from "./PendingInvites";
import { getFunctions, httpsCallable } from "@firebase/functions";

interface EmployeesViewerProps {
  localUsers: UserType[];
  setLocalUsers: React.Dispatch<React.SetStateAction<UserType[]>>;
}

const EmployeesViewer: React.FC<EmployeesViewerProps> = ({
  localUsers,
  setLocalUsers,
}) => {
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyId = user?.companyId;
  const companyUsers = useSelector(selectCompanyUsers);
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";
  const isSuperAdmin = user?.role === "super-admin";
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");



  useEffect(() => {
    if (!companyId) {
      // If companyId is not defined, do not proceed with the query
      console.log("companyId is undefined, skipping Firestore query.");
      return;
    }

    const q = query(
      collection(db, "users"),
      where("companyId", "==", companyId)
    );

    // Firestore real-time subscription setup
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const usersFromFirestore = snapshot.docs.map(
          (doc) =>
            ({
              ...doc.data(),
              uid: doc.id,
            } as UserType)
        );

        dispatch(setCompanyUsers(usersFromFirestore)); // Update Redux store
        setLocalUsers(usersFromFirestore); // Update local state

        // Save the updated list to IndexedDB
        console.log("saving users to indexedDB");
        await saveCompanyUsersToIndexedDB(usersFromFirestore);
      },
      (error) => {
        console.error("Error fetching users:", error);
      }
    );

    // Return a cleanup function to unsubscribe from Firestore updates when the component unmounts
    return () => unsubscribe();
  }, [companyId]);

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

  function toggleInvites() {
    setShowPendingInvites((prevState) => !prevState);
  }

  const handleInviteSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (user?.companyId && companyName) {
      // Ensure both companyId and companyName are available
      try {
        const functions = getFunctions(); // Initialize Firebase Functions
        const sendInviteFunction = httpsCallable(functions, "sendInvite");

        // Generate the invite link
        const inviteLink = `https://displaygram.com/sign-up-login?companyName=${encodeURIComponent(
          companyName
        )}&email=${encodeURIComponent(inviteEmail)}`;

        // Call the sendInvite Cloud Function
        await sendInviteFunction({
          email: inviteEmail,
          companyId: user.companyId,
          inviter: user.email,
          inviteLink,
        });

        // Record the invite in Firestore
        await setDoc(doc(db, "invites", inviteEmail), {
          email: inviteEmail,
          companyId: user.companyId,
          status: "pending",
          inviter: user.email,
          timestamp: serverTimestamp(),
          link: inviteLink,
        });

        console.log("Invite sent to", inviteEmail);
        setInviteEmail(""); // Reset the input field
      } catch (error) {
        console.error("Error sending invite:", error);
      }
    } else {
      console.error("Company ID or Company Name is undefined");
    }
  };

  return (
    <Container>
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
      <Box className="card role-management-card">
        <div className="header-and-all-info">
          <div className="table-header">
            <div className="user-name-detail">Name</div>
            <div className="user-detail">Email</div>
            <div className="user-phone-detail">Phone Number</div>
            <div className="user-role-detail">Role</div>
          </div>

          <div>
            {localUsers.map((localUser) => (
              <div className="all-user-info" key={localUser.uid}>
                <div className="user-name-email">
                  <div className="user-name-detail">{`${localUser.firstName} ${localUser.lastName}`}</div>
                  <div className="user-detail">{localUser.email}</div>
                </div>
                <div className="user-phone-role">
                  <div className="user-phone-detail">{localUser.phone}</div>
                  <div className="user-role-detail">
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
              </div>
            ))}
          </div>
        </div>
      </Box>
    </Container>
  );
};

export default EmployeesViewer;
