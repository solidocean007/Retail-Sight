import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import UserList from "../UserList";
import { useSelector } from "react-redux";
import {
  fetchCompaniesWithUsers,
  selectCompaniesLoading,
  selectCompaniesWithUsers,
} from "../../Slices/allCompaniesSlice";
import { useEffect, useState } from "react";
import { useAppDispatch } from "../../utils/store";
import CustomConfirmation from "../CustomConfirmation";
import { UserType } from "../../utils/types";
import {
  deleteUserAuthAndFirestore,
  updateSelectedUser,
} from "../../DeveloperAdminFunctions/developerAdminFunctions";
import { ExpandCircleDown } from "@mui/icons-material";

const DeveloperUsersManager = () => {
  const dispatch = useAppDispatch();
  const loading = useSelector(selectCompaniesLoading);
  const allCompaniesAndUsers = useSelector(selectCompaniesWithUsers);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Ask for confirmation before deleting user
  const askDelete = (uid: string): Promise<void> => {
    setTargetUserId(uid);
    setConfirmOpen(true);
    return Promise.resolve(); // 👈 resolves immediately
  };
  const handleConfirmDelete = async () => {
    if (!targetUserId) return;
    setDeleting(true);
    try {
      await deleteUserAuthAndFirestore(targetUserId);
    } catch (err) {
      console.error("Failed to delete user:", err);
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
      setTargetUserId(null);
    }
  };

  const handleEditUser = async (adminId: string, user: UserType) =>
    updateSelectedUser(adminId, user);

  useEffect(() => {
    if (!allCompaniesAndUsers.length && !loading) {
      dispatch(fetchCompaniesWithUsers());
    }
  }, [allCompaniesAndUsers.length, loading, dispatch]);

  return (
    <div className="deverloper-users-manager">
      {allCompaniesAndUsers.map((company) => (
        <Accordion key={company.id}>
          <AccordionSummary expandIcon={<ExpandCircleDown />}>
            <Typography variant="h6">{company.companyName}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {[
              "superAdminDetails",
              "adminDetails",
              "employeeDetails",
              "pendingDetails",
            ].map((key) => (
              <UserList
                key={key}
                users={company[key as keyof typeof company] as UserType[]}
                onDelete={askDelete} // Type '(uid: string) => void' is not assignable to type '(userId: string) => Promise<void>'.
                // Type 'void' is not assignable to type 'Promise<void>'.
                onEdit={handleEditUser}
              />
            ))}
          </AccordionDetails>
        </Accordion>
      ))}
      <CustomConfirmation
        isOpen={confirmOpen}
        message="Permanently delete this user? This can’t be undone."
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmOpen(false)}
        loading={deleting}
      />
    </div>
  );
};

export default DeveloperUsersManager;
