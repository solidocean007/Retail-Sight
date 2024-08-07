// Dashboard.tsx
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import React, { useEffect, useState } from "react";
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
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  Toolbar,
  Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import EmployeesViewer from "./EmployeesViewer";
import UserProfileViewer from "./UserProfileViewer";

export const Dashboard = () => {
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [showProfile, setShowShowProfile] = useState(false);
  const [showTeams, setShowTeams] = useState(true);

  const user = useSelector(selectUser);
  const [inviteEmail, setInviteEmail] = useState("");
  const companyId = useSelector(
    (state: RootState) => state.user.currentUser?.companyId
  );
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  // const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  // const companyUsers = useSelector(selectCompanyUsers); // this is a selector to company users stored in state.  its not beign used right now

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  // const isAdmin = user?.role === "admin";
  // const isDeveloper = user?.role === "developer";
  // const isSuperAdmin = user?.role === "super-admin";
  // const companyName = user?.company;

  // const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const handleHomeClick = () => {
    toggleDrawer(false);
    navigate("/user-home-page");
  };

  const handleTeamsClick = () => {
    toggleDrawer(false);
    setShowTeams(true);
 
  }

  const handleUsersClick = () => {
    console.log('click')
    toggleDrawer(false);
    setShowTeams(false);
    setShowAllEmployees(true);
  }

  const handleProfileClick = () => {
    toggleDrawer(false);
    setShowTeams(false);
    setShowAllEmployees(false);
    setShowShowProfile(true);
  }

  const handleApiClick = () => {
    toggleDrawer(false);
    setShowTeams(false);
    setShowAllEmployees(false);
    setShowShowProfile(false);
  }

  const toggleDrawer =
    (open: boolean) => (event: React.MouseEvent | React.KeyboardEvent) => {
      if (
        event.type === "keydown" &&
        ((event as React.KeyboardEvent).key === "Tab" ||
          (event as React.KeyboardEvent).key === "Shift")
      ) {
        return;
      }
      setDrawerOpen(open);
    };

  // function toggleInvites() {
  //   setShowPendingInvites((prevState) => !prevState);
  // }
  // function toggleShowAllEmployees() {
  //   setShowAllEmployees((prevState) => !prevState);
  // }
  // function toggleShowTeams() {
  //   setShowTeams((prevState) => !prevState);
  // }

  // const handleInviteSubmit = async (
  //   event: React.FormEvent<HTMLFormElement>
  // ) => {
  //   event.preventDefault();

  //   if (user?.companyId && companyName) {
  //     // Ensure both companyId and companyName are available
  //     try {
  //       const functions = getFunctions(); // Initialize Firebase Functions
  //       const sendInviteFunction = httpsCallable(functions, "sendInvite");

  //       // Generate the invite link
  //       const inviteLink = `https://displaygram.com/sign-up-login?companyName=${encodeURIComponent(
  //         companyName
  //       )}&email=${encodeURIComponent(inviteEmail)}`;

  //       // Call the sendInvite Cloud Function
  //       await sendInviteFunction({
  //         email: inviteEmail,
  //         companyId: user.companyId,
  //         inviter: user.email,
  //         inviteLink,
  //       });

  //       // Record the invite in Firestore
  //       await setDoc(doc(db, "invites", inviteEmail), {
  //         email: inviteEmail,
  //         companyId: user.companyId,
  //         status: "pending",
  //         inviter: user.email,
  //         timestamp: serverTimestamp(),
  //         link: inviteLink,
  //       });

  //       console.log("Invite sent to", inviteEmail);
  //       setInviteEmail(""); // Reset the input field
  //     } catch (error) {
  //       console.error("Error sending invite:", error);
  //     }
  //   } else {
  //     console.error("Company ID or Company Name is undefined");
  //   }
  // };

  // useEffect(() => {
  //   if (!companyId) {
  //     // If companyId is not defined, do not proceed with the query
  //     console.log("companyId is undefined, skipping Firestore query.");
  //     return;
  //   }

  //   const q = query(
  //     collection(db, "users"),
  //     where("companyId", "==", companyId)
  //   );

  //   // Firestore real-time subscription setup
  //   const unsubscribe = onSnapshot(
  //     q,
  //     async (snapshot) => {
  //       const usersFromFirestore = snapshot.docs.map(
  //         (doc) =>
  //           ({
  //             ...doc.data(),
  //             uid: doc.id,
  //           } as UserType)
  //       );

  //       dispatch(setCompanyUsers(usersFromFirestore)); // Update Redux store
  //       setLocalUsers(usersFromFirestore); // Update local state

  //       // Save the updated list to IndexedDB
  //       console.log("saving users to indexedDB");
  //       await saveCompanyUsersToIndexedDB(usersFromFirestore);
  //     },
  //     (error) => {
  //       console.error("Error fetching users:", error);
  //     }
  //   );

  //   // Return a cleanup function to unsubscribe from Firestore updates when the component unmounts
  //   return () => unsubscribe();
  // }, [companyId]);

  // Separate useEffect to attempt to load from IndexedDB when component mounts
  // useEffect(() => {
  //   const loadFromIndexedDB = async () => {
  //     // Attempt to get users from IndexedDB
  //     const indexedDBUsers = await getCompanyUsersFromIndexedDB();
  //     if (indexedDBUsers && indexedDBUsers.length > 0) {
  //       setLocalUsers(indexedDBUsers);
  //     }
  //   };

  //   loadFromIndexedDB();
  // }, []);

  // Type guard function to check if a string is a valid role
  // function isValidRole(role: string): role is UserType["role"] {
  //   return ["admin", "employee", "status-pending", "developer"].includes(role);
  // }

  // const handleRoleChange = async (userId: string, newRole: string) => {
  //   // Ensure only super-admin can change roles, and admins cannot change their own role
  //   if (!isSuperAdmin || (isAdmin && user?.uid === userId)) {
  //     console.error("You do not have permission to change this role.");
  //     return;
  //   }

  //   if (!isValidRole(newRole)) {
  //     console.error("Invalid role");
  //     return;
  //   }

  //   try {
  //     // Update Firestore
  //     const userDocRef = doc(db, "users", userId);
  //     await setDoc(userDocRef, { role: newRole }, { merge: true });

  //     // Update local state
  //     const updatedUsers = localUsers.map((user) =>
  //       user.uid === userId ? { ...user, role: newRole } : user
  //     );
  //     setLocalUsers(updatedUsers);

  //     // Update IndexedDB
  //     updateUserRoleInIndexedDB(userId, newRole);
  //   } catch (error) {
  //     console.error("Error updating user role:", error);
  //   }
  // };

  return (
    <Container>
      <DashboardHelmet />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Dashboard
            </Typography>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      </Box>
      <Box>

      {showTeams && <TeamsViewer />}
      {showAllEmployees && <EmployeesViewer user={user} companyId={companyId} /> }
      {showProfile && <UserProfileViewer  user={user} />}

      </Box>


      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <List>
          <ListItem onClick={handleHomeClick}>
            <ListItemText primary="Home" />
          </ListItem>
          <ListItem onClick={handleTeamsClick}>
            <ListItemText primary="Teams" />
          </ListItem>
          <ListItem onClick={handleUsersClick}>
            <ListItemText primary="Users" />
          </ListItem>
          <ListItem onClick={handleProfileClick}>
            <ListItemText primary="Profile" />
          </ListItem>
          <ListItem onClick={handleApiClick}>
            <ListItemText primary="Api" />
          </ListItem>
        </List>
      </Drawer>
    </Container>
  );
};

export default Dashboard;
