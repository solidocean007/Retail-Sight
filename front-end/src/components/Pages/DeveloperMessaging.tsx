import { useSelector } from "react-redux";
import { useAppDispatch } from "../../utils/store";
import { UserType } from "../../utils/types";
import DeveloperNotificationForm from "../Notifications/DeveloperNotificationForm";
import {
  selectCompaniesLoading,
  selectCompaniesWithUsers,
} from "../../Slices/allCompaniesSlice";
import { selectUser } from "../../Slices/userSlice";
import DeveloperNotificationsTable from "../Notifications/DeveloperNotificationsTable";

const DeveloperMessaging = () => {
  const dispatch = useAppDispatch();
  const dashboardUser = useSelector(selectUser);
  const loading = useSelector(selectCompaniesLoading);
  const allCompaniesAndUsers = useSelector(selectCompaniesWithUsers);
  return (
    <div className="deverloper-messaging">
      <DeveloperNotificationForm
        // isDeveloper={dashboardUser?.role === "developer"}
        currentUser={dashboardUser as UserType}
        allCompaniesAndUsers={allCompaniesAndUsers}
      />
       <DeveloperNotificationsTable
                  allCompaniesAndUsers={allCompaniesAndUsers}
                />
    </div>
  );
};
export default DeveloperMessaging;
