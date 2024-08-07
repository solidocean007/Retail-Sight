import { Box } from "@mui/material"
import React, { useEffect, useState } from "react";
import { UserType } from "../utils/types";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import { useAppDispatch } from "../utils/store";
import { saveCompanyUsersToIndexedDB } from "../utils/database/userDataIndexedDB";
import { selectCompanyUsers, setCompanyUsers } from "../Slices/userSlice";
import { useSelector } from "react-redux";

interface EmployeesViewerProps {
  user: UserType | null,
  companyId: string | undefined,
}

const EmployeesViewer: React.FC<EmployeesViewerProps> = ({
  user,
  companyId,
}) => {
  const dispatch = useAppDispatch();
  const [localUsers, setLocalUsers] = useState<UserType[]>([]);
  const companyUsers = useSelector(selectCompanyUsers);
   const isAdmin = user?.role === "admin";
  const isDeveloper = user?.role === "developer";
  const isSuperAdmin = user?.role === "super-admin";

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

  return (
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
            </Box>
  )
}

export default EmployeesViewer;