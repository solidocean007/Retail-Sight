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
import {
  CompanyAccountType,
  DashboardModeType,
  UserType,
} from "../utils/types";
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
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "@firebase/firestore";
import { db } from "../utils/firebase.ts";
import GoalManager from "./GoalIntegration/GoalManager.tsx";
import { fetchAllCompanyAccounts } from "../utils/helperFunctions/fetchAllCompanyAccounts.ts";
import {
  selectAllCompanyAccounts,
  setAllAccounts,
} from "../Slices/allAccountsSlice.ts";
import { saveAllCompanyAccountsToIndexedDB } from "../utils/database/indexedDBUtils.ts";
import DashMenu from "./DashMenu.tsx";
// import { updatePostsWithFreshAccounts } from "../script.ts";
import ProductsManager from "./ProductsManagement/ProductsManager.tsx";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  // const navigate = useNavigate();
  const isLargeScreen = useMediaQuery("(min-width: 768px)");
  const drawerWidth = 240;
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const dispatch = useAppDispatch();
  const user = useSelector(selectUser);
  const companyId = user?.companyId;
  // const [drawerOpen, setDrawerOpen] = useState(isLargeScreen);
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Placeholder for role check. Replace 'user.role' with the actual role property.
  const isEmployee = user?.role === "employee";
  // const isEmployee = true;
  const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer"; // this needs to be used also
  const isSuperAdmin = user?.role === "super-admin";
  const allAccounts = useSelector(selectAllCompanyAccounts);

  // handleUpdatePosts();

  const [dashboardMode, setDashboardMode] = useState<DashboardModeType>(
    isEmployee ? "MyGoalsMode" : "GoalManagerMode"
  );

  const [selectedMode, setSelectedMode] = useState<DashboardModeType>(
    isEmployee ? "MyGoalsMode" : "GoalManagerMode"
  );

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const savedMode = sessionStorage.getItem(
      "dashboardMode"
    ) as DashboardModeType;
    if (savedMode) {
      setDashboardMode(savedMode);
      setSelectedMode(savedMode);
      sessionStorage.removeItem("dashboardMode");
    }
  }, []);

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
  // if we flip into desktop view, open the drawer
  if (isLargeScreen) {
    setDrawerOpen(true);
  }
  // but if we flip into mobile, leave whatever state we were in
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
          padding: 0,
          height: "100%"
        }}
      >
        {dashboardMode === "TeamMode" && (
          <TeamsViewer localUsers={localUsers} setLocalUsers={setLocalUsers} />
        )}
        {dashboardMode === "AccountsMode" && (
          <AccountManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
        )}
        {dashboardMode === "ProductsMode" && (
          <ProductsManager isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />
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
        {dashboardMode === "CollectionsMode" && (
          <CollectionsViewer setDashboardMode={setDashboardMode} />
        )}
        {dashboardMode === "TutorialMode" && <TutorialViewer />}
      </Box>
    </div>
  );
};

export default Dashboard;
