// import { useEffect, useState } from "react";
// import { getDocs, collection, onSnapshot, where, query } from "firebase/firestore";
// import { db } from "../utils/firebase";
// import { CompanyType, UserType } from "../utils/types";
// import { CompanyType } from "../utils/types";
// import { updateSelectedUser } from "../DeveloperAdminFunctions/developerAdminFunctions";
// import { useSelector } from "react-redux";
// import { selectUser } from "../Slices/userSlice";
// import { useAppDispatch } from "../utils/store";

// import { deleteUser } from "@firebase/auth";

// Define a type that includes both CompanyType and the document ID
// type CompanyWithID = CompanyType & { id: string };

const DeveloperDashboard = () => {
  // const dashboardUser = useSelector(selectUser);
  // const userHasAccess = dashboardUser?.role === "developer";
  // const [companies, setCompanies] = useState<CompanyWithID[]>([]);
  // const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
  //   null
  // );
  // const dispatch = useAppDispatch();
  // const [lastMountTime, setLastMountTime] = useState("");

  // listen for changes to the company firestore document and update the state of companies
  // useEffect(() => {
  //   // Store the mount time of the component
  //   const mountTime = new Date().toISOString();
  //   // setLastMountTime(mountTime);

  //   const q = query(
  //     collection(db, "companies"),
  //     where("lastUpdated", ">", mountTime)
  //   );

  //   const unsubscribe = onSnapshot(q, (snapshot) => {
  //     const updatedCompanies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as CompanyType }));
  //     setCompanies(prevCompanies => [...prevCompanies, ...updatedCompanies]);
  //   });

  //   return () => {
  //     unsubscribe();
  //   };
  // }, []);
  

  // useEffect(() => {
  //   const fetchCompanies = async () => {
  //     const querySnapshot = await getDocs(collection(db, "companies"));
  //     const companiesData = querySnapshot.docs.map((doc) => ({
  //       id: doc.id,
  //       ...(doc.data() as CompanyType),
  //     }));
  //     setCompanies(companiesData);
  //   };
  //   if (userHasAccess) {
  //     fetchCompanies();
  //   }
  // }, [ userHasAccess ]);

  // const handleDeleteUser = async (userId) => {
  //   // Call deleteUser function here
  //   deleteUser
  // };

  // const handleEditUser = async (adminId:string, user: UserType) => {
  //   // Call updateUser function here
  //   // updateSelectedUser(userId, user)
  // };

  // return (
  //   <div>
  //     <h1>Companies</h1>
  //     {companies.map((company) => (
  //       <div key={company.id}>
  //         <h2 onClick={() => setSelectedCompanyId(company.id)}>
  //           {company.companyName}
  //         </h2>
  //         {selectedCompanyId === company.id && (
  //           <div>
  //             {/* Admins Table */}
  //             <h3>Admins</h3>
  //             {/* Replace with table or list component */}
  //             {company.admins.map((adminId) => (
  //               <div key={adminId}>
  //                 {adminId}
  //                 <button onClick={() => handleEditUser(adminId)}>Edit</button>
  //                 <button onClick={() => handleDeleteUser(adminId)}>
  //                   Delete
  //                 </button>
  //               </div>
  //             ))}

  //             {/* Employees Table */}
  //             <h3>Employees</h3>
  //             {/* Replace with table or list component */}
  //             {company.employees.map((employeeId) => (
  //               <div key={employeeId}>
  //                 {employeeId}
  //                 <button onClick={() => handleEditUser(employeeId)}>
  //                   Edit
  //                 </button>
  //                  <button onClick={() => handleDeleteUser(employeeId)}>
  //                    Delete
  //                  </button>
  //               </div>
  //             ))}

  //             {/* Status Pending Table */}
  //             <h3>Status Pending</h3>
  //             {/* Replace with table or list component */}
  //             {company.statusPending.map((userId) => (
  //               <div key={userId}>
  //                 {userId}
  //                 <button onClick={() => handleEditUser(userId)}>Edit</button>
  //                 <button onClick={() => handleDeleteUser(userId)}>
  //                   Delete
  //                 </button>
  //               </div>
  //             ))}
  //           </div>
  //         )}
  //       </div>
  //     ))}
  //   </div>
  // );
};

export default DeveloperDashboard;
