// Dashboard.tsx
// import React from 'react';
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import { useEffect, useState } from "react";
import {
  selectCompanyUsers,
  selectUser,
  setCompanyUsers,
} from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
  updateUserRoleInIndexedDB,
} from "../utils/database/userDataIndexedDB";
// import { fetchCompanyUsers } from "../thunks/usersThunks";
import { UserType } from "../utils/types";
import { RootState, useAppDispatch } from "../utils/store";
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import "./dashboard.css";
import { DashboardHelmet } from "../utils/helmetConfigurations";
import { getFunctions, httpsCallable } from "@firebase/functions";
import PendingInvites from "./PendingInvites";
import TeamsViewer from "./TeamsViewer";
// import firebase from "firebase/compat/app";

export const Dashboard = () => {
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [showTeams, setShowTeams] = useState(false);

  const user = useSelector(selectUser);
  const [inviteEmail, setInviteEmail] = useState("");
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const companyUsers = useSelector(selectCompanyUsers); // this is a selector to company users stored in state.  its not beign used right now

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";
  const isSuperAdmin = user?.role === "super-admin";
  const companyName = user?.company;

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null); // not sure why i have this

  function toggleInvites() {
    setShowPendingInvites((prevState) => !prevState);
  }
  function toggleShowAllEmployees() {
    setShowAllEmployees((prevState) => !prevState);
  }
  function toggleShowTeams() {
    setShowTeams((prevState) => !prevState);
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
  }, [companyId]); // Dependency array includes companyId to re-run the effect when it changes

  // Separate useEffect to attempt to load from IndexedDB when component mounts
  useEffect(() => {
    const loadFromIndexedDB = async () => {
      // Attempt to get users from IndexedDB
      const indexedDBUsers = await getCompanyUsersFromIndexedDB();
      if (indexedDBUsers && indexedDBUsers.length > 0) {
        setLocalUsers(indexedDBUsers);
      }
    };

    loadFromIndexedDB();
  }, []);

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
    <>
      <DashboardHelmet />
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
            </div>
          </header>
          <button className="button-blue" onClick={toggleShowTeams}>
            <h4>{!showTeams ? "Teams" : ' X '}</h4>
          </button>
          {showTeams && <TeamsViewer />}
          {/* Invite Form Section */}

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
          <section className="dashboard-content">
            <button className="button-blue" onClick={toggleShowAllEmployees}>
              {showAllEmployees ? "Close employee list" : "Show Employees list"}
            </button>
            {showAllEmployees && (
              <div className="card role-management-card">
                <div className="header-and-all-info">
                  <div className="table-header">
                    <div className="user-name-detail">Name</div>
                    <div className="user-detail">Email</div>
                    <div className="user-phone-detail">Phone Number</div>
                    <div className="user-role-detial">Role</div>
                  </div>

                  <div>
                    {localUsers.map((localUser) => (
                      <div className="all-user-info" key={localUser.uid}>
                        <div className="user-name-email">
                          <div className="user-name-detail">{`${localUser.firstName} ${localUser.lastName}`}</div>
                          <div className="user-detail">{localUser.email}</div>
                        </div>
                        <div className="user-phone-role">
                          <div className="user-phone-detail">
                            {localUser.phone}
                          </div>
                          <div className="user-role-detail">
                            {isSuperAdmin && localUser.uid !== user?.uid ? (
                              <select
                                title="role-select"
                                value={localUser.role}
                                onChange={(e) =>
                                  handleRoleChange(
                                    localUser.uid!,
                                    e.target.value
                                  )
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
              </div>
            )}

            {/* Additional cards for other dashboard content */}
          </section>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
