// Dashboard.tsx
import { useSelector } from "react-redux";
import "./dashboard.css";
import React, { useEffect, useState } from "react";
import { selectUser, setCompanyUsers } from "../Slices/userSlice";
import {
  getCompanyUsersFromIndexedDB,
  saveCompanyUsersToIndexedDB,
} from "../utils/database/userDataIndexedDB";
// import { fetchCompanyUsers } from "../thunks/usersThunks";
import { DashboardModeType, UserType } from "../utils/types";
import { useAppDispatch } from "../utils/store";
import "./dashboard.css";
import { DashboardHelmet } from "../utils/helmetConfigurations";
import TeamsViewer from "./TeamsViewer";
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import EmployeesViewer from "./EmployeesViewer";
import UserProfileViewer from "./UserProfileViewer";
import CollectionsViewer from "./CollectionsViewer";
import TutorialViewer from "./TutorialViewer";
import AccountManager from "./AccountManagement/AccountsManager.tsx";
import MyGoals from "./MyGoals.tsx";
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../utils/firebase.ts";
import GoalManager from "./GoalIntegration/GoalManager.tsx";
import { fetchAllCompanyAccounts } from "../utils/helperFunctions/fetchAllCompanyAccounts.ts";
import { setAllAccounts } from "../Slices/allAccountsSlice.ts";
import { saveAllCompanyAccountsToIndexedDB } from "../utils/database/indexedDBUtils.ts";
import DashMenu from "./DashMenu.tsx";

export const Dashboard = () => {
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const drawerWidth = 240;
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyId = user?.companyId;
  const [drawerOpen, setDrawerOpen] = useState(isLargeScreen);

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isEmployee = user?.role === "employee";
  // const isEmployee = true;
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer"; // this needs to be used also
  const isSuperAdmin = user?.role === "super-admin";

  const [dashboardMode, setDashboardMode] = useState<DashboardModeType>(
    isEmployee ? "MyGoalsMode" : "GoalManagerMode"
  );

  const [selectedMode, setSelectedMode] = useState<DashboardModeType>(
    isEmployee ? "MyGoalsMode" : "GoalManagerMode"
  );

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const handleMenuClick = (mode: DashboardModeType) => {
    setSelectedMode(mode);
    setDashboardMode(mode); // ✅ now the render logic responds!
    setDrawerOpen(false);
  };

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

  useEffect(() => {
    setDrawerOpen(isLargeScreen);
  }, [isLargeScreen]);

  useEffect(() => {
    const syncCompanyUsers = async () => {
      if (!user?.companyId) return;

      const companyId = user.companyId;

      // 1. Load cached users from IndexedDB
      const cachedUsers = await getCompanyUsersFromIndexedDB();
      if (cachedUsers && cachedUsers.length > 0) {
        dispatch(setCompanyUsers(cachedUsers)); // Update Redux store
        setLocalUsers(cachedUsers); // Update local state
      }

      // 2. Real-time Firestore listener
      const q = query(
        collection(db, "users"),
        where("companyId", "==", companyId)
      );
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

          // 3. Update Redux store and IndexedDB if Firestore data changes
          dispatch(setCompanyUsers(usersFromFirestore));
          setLocalUsers(usersFromFirestore);
          await saveCompanyUsersToIndexedDB(usersFromFirestore);
        },
        (error) => {
          console.error("Error syncing company users:", error);
        }
      );

      return () => unsubscribe(); // Cleanup listener
    };

    syncCompanyUsers();
  }, [user?.companyId, dispatch]);

  useEffect(() => {
    const loadAllCompanyAccounts = async () => {
      if (!user?.companyId || user.role === "employee") return;

      const accounts = await fetchAllCompanyAccounts(user.companyId);
      if (!accounts.length) return;

      dispatch(setAllAccounts(accounts)); // ⬅️ Save to Redux

      try {
        await saveAllCompanyAccountsToIndexedDB(accounts); // ⬅️ Optional: Save for offline use
      } catch (err) {
        console.warn("Could not save accounts to IndexedDB", err);
      }
    };

    loadAllCompanyAccounts();
  }, [user?.companyId, user?.role, dispatch]);

  return (
    <div className="dashboard-container">
      <DashboardHelmet />
      <Box sx={{ flexGrow: 1, ml: isLargeScreen ? `${drawerWidth}px` : 0 }}>
        <AppBar position="static">
          <Toolbar
            sx={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--dashboard-header-background)",
              // backgroundColor: "red",
              color: "var(--text-color)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h1"
              component="div"
              sx={{
                flexGrow: 1,
                fontSize: "40px",
                // backgroundColor: "var(--menu-background-color)", // ✅ THEMED
                color: "var(--text-color)",
              }}
            >
              Dashboard
            </Typography>
            {/* <Typography variant="caption" color="textSecondary">
              Screen Width: {screenWidth}px
            </Typography> */}

            {!isLargeScreen && (
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={toggleDrawer(true)}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>
      </Box>

      <DashMenu
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant={isLargeScreen ? "permanent" : "temporary"}
        onMenuClick={handleMenuClick}
        isEmployee={isEmployee}
        selectedMode={selectedMode} // ✅ pass current selection
      />

      <Box
        sx={{
          marginLeft: isLargeScreen ? `${drawerWidth}px` : 0,
          padding: 0, // Add some padding for better spacing
        }}
      >
        {dashboardMode === "TeamMode" && (
          <TeamsViewer localUsers={localUsers} setLocalUsers={setLocalUsers} />
        )}
        {dashboardMode === "AccountsMode" && (
          <AccountManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        )}
        {dashboardMode === "MyGoalsMode" && <MyGoals />}
        {dashboardMode === "UsersMode" && (
          <EmployeesViewer
            localUsers={localUsers}
            setLocalUsers={setLocalUsers}
          />
        )}
        {dashboardMode === "ProfileMode" && <UserProfileViewer user={user} />}
        {dashboardMode === "GoalManagerMode" && (
          <GoalManager companyId={companyId} />
        )}
        {dashboardMode === "CollectionsMode" && <CollectionsViewer />}
        {dashboardMode === "TutorialMode" && <TutorialViewer />}
      </Box>
    </div>
    // <Container disableGutters maxWidth={false}>

    // </Container>
  );
};

// export const fixSubmittedByUser = async () => {
//   const goalId = "hWXopstr1FDJTr33ToRG"; // The goal you want to fix
//   const developerUid = "n0dSVcfakMhwCByREdD3bmMv8tl1"; // 🔥 replace with your real developer user id
//   const adminUserObject = {
//     uid: "TbL2z246iBbshTSIMskByZNa2bQ2",
//     firstName: "Clinton",
//     lastName: "Williams",
//     company: "Healy wholesale Inc",
//     companyId: "3WOAwgj3l3bnvHqE4IV3",
//     email: "cwilliams@healywholesale.com",
//     role: "admin",
//     salesRouteNum: "85" || "", // optional
//     phone: "9105836914" || "", // optional
//   };

//   try {
//     const goalRef = doc(db, "companyGoals", goalId);
//     const goalSnap = await getDoc(goalRef);

//     if (!goalSnap.exists()) {
//       console.error(`❌ Goal ${goalId} not found.`);
//       return;
//     }

//     const goalData = goalSnap.data();
//     const submittedPosts = goalData.submittedPosts || [];

//     const updatedSubmittedPosts = submittedPosts.map((submission: any) => {
//       if (submission.submittedBy?.uid === developerUid) {
//         console.log(`✅ Fixing submission for postId: ${submission.postId}`);
//         return {
//           ...submission,
//           submittedBy: adminUserObject,
//         };
//       }
//       return submission;
//     });

//     await updateDoc(goalRef, {
//       submittedPosts: updatedSubmittedPosts,
//     });

//     console.log("🎯 Successfully updated submittedBy user.");
//   } catch (error) {
//     console.error("❌ Failed to update submittedBy:", error);
//   }
// };

// fixSubmittedByUser(); // 🔥 Call this function to fix the submittedBy user

export default Dashboard;
