// DeveloperDashboard.tsx
import { useEffect, useState } from "react";
import {
  getDocs,
  collection,
  onSnapshot,
  where,
  query,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { CompanyType, UserType } from "../utils/types";
import {
  deleteUserAuthAndFirestore,
  updateSelectedUser,
} from "../DeveloperAdminFunctions/developerAdminFunctions";
import { useSelector } from "react-redux";
import { selectUser } from "../Slices/userSlice";
// import { useAppDispatch } from "../utils/store";
import { useNavigate } from "react-router-dom";
import "./developerDashboard.css";
import UserList from "./UserList";
import { fetchCompanyUsersFromFirestore } from "../thunks/usersThunks";

// Define a type that includes both CompanyType and the document ID
type CompanyWithId = CompanyType & {
  id: string;
  users: UserType[]; // Assuming you need to keep all users together
  superAdminDetails: UserType[];
  adminDetails: UserType[];
  employeeDetails: UserType[];
  pendingDetails: UserType[];
};


const DeveloperDashboard = () => {
  const dashboardUser = useSelector(selectUser);
  const userHasAccess = dashboardUser?.role === "developer";
  const [companies, setCompanies] = useState<CompanyWithId[]>([]);

  const navigate = useNavigate();

  // this function sets all companies
  useEffect(() => {
    const fetchCompaniesAndUsers = async () => {
      if (userHasAccess) {
        // Fetch all companies
        const querySnapshot = await getDocs(collection(db, "companies"));
        const companiesWithUsers: CompanyWithId[] = await Promise.all(
          querySnapshot.docs.map(async (docSnapshot) => {
            const company = { id: docSnapshot.id, ...(docSnapshot.data() as CompanyType) };
            // Fetch all users for the company
            const allUsers = await fetchCompanyUsersFromFirestore(company.id);
            // Filter users based on their roles
            const superAdminDetails = allUsers.filter(user => user.role === 'super-admin');
            const adminDetails = allUsers.filter(user => user.role === 'admin');
            const employeeDetails = allUsers.filter(user => user.role === 'employee');
            const pendingDetails = allUsers.filter(user => user.role === 'status-pending');
            return { 
              ...company, 
              users: allUsers,
              superAdminDetails,
              adminDetails, 
              employeeDetails, 
              pendingDetails 
            };
          })
        );
        setCompanies(companiesWithUsers); // Set companies with users separated by role
      }
    };
    fetchCompaniesAndUsers();
  }, [userHasAccess]);
  

  // listen for changes to the company firestore document and update the state of companies
  useEffect(() => {
    // Store the mount time of the component
    const mountTime = new Date().toISOString();

    const q = query(
      collection(db, "companies"),
      where("lastUpdated", ">", mountTime)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedCompanies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as CompanyType),
      }));
      setCompanies((prevCompanies) => [...prevCompanies, ...updatedCompanies]); // Type '{ lastUpdated: string; companyName: string; altCompanyNames: string[]; superAdminsUsers: string[]; adminsUsers: string[]; employeeUsers: string[]; statusPendingUsers: string[]; companyVerified: boolean; createdAt: string; id: string; }' is missing the following properties from type '{ id: string; users: UserType[]; superAdminDetails: UserType[]; adminDetails: UserType[]; employeeDetails: UserType[]; pendingDetails: UserType[]; }': users, superAdminDetails, adminDetails, employeeDetails, pendingDetailsts(2345)
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDeleteUser = async (userId: string) => {
    // Call deleteUser function here
    deleteUserAuthAndFirestore(userId);
  };

  const handleEditUser = async (adminId: string, user: UserType) => {
    // Call updateUser function here
    updateSelectedUser(adminId, user);
  };
  console.log(companies)
  return (
    <div className="developer-dashboard-container">
      <aside className="developer-dashboard-sidebar">
        {/* Sidebar with navigation links */}
        {/* ... */}
      </aside>

      <main className="developer-dashboard-main">
        <header className="developer-dashboard-header">
          {/* Top bar with user info and controls */}
          <div className="developer-dashboard-user-details">
            <h3>Developer Dashboard</h3>
            <p>{`${dashboardUser?.firstName} ${dashboardUser?.lastName} Role: ${dashboardUser?.role}`}</p>
          </div>
          <div className="dashboard-controls">
            <button className="add-user-btn">Add Users</button>

            <button className="home-btn" onClick={() => navigate("/")}>
              Home
            </button>
          </div>
        </header>

        <section className="developer-dashboard-content">
          <div className="developer-dashboard-cards">
            {companies.map((company) => (
              <div key={company.id} className="card">
                <h2>{company.companyName}</h2>
                <UserList
                  users={company.superAdminDetails} // Property 'superAdminDetails' does not exist on type 'CompanyWithId'.
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                />
                <UserList
                  users={company.adminDetails} // Property 'adminDetails' does not exist on type 'CompanyWithId'.ts(2339)
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                />
                <UserList
                  users={company.employeeDetails} // Property 'employeeDetails' does not exist on type 'CompanyWithId'.ts(2339
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                />
                <UserList
                  users={company.pendingDetails} // Property 'pendingDetails' does not exist on type 'CompanyWithId'.ts(2339)
                  onEdit={handleEditUser}
                  onDelete={handleDeleteUser}
                />
                {/* Add UserList instances for other roles */}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DeveloperDashboard;
