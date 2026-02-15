import { useSelector } from "react-redux";
import { useAppDispatch } from "../../utils/store";
import { UserType } from "../../utils/types";
import DeveloperNotificationForm from "./DeveloperNotificationForm";
import {
  selectCompaniesLoading,
  selectCompaniesWithUsers,
} from "../../Slices/allCompaniesSlice";
import { selectUser } from "../../Slices/userSlice";
import DeveloperNotificationsTable from "./DeveloperNotificationsTable";
import DeveloperAnalytics from "./DeveloperAnalytics";

const DeveloperMessaging = () => {
  const dispatch = useAppDispatch();
  const dashboardUser = useSelector(selectUser);
  const loading = useSelector(selectCompaniesLoading);
  const allCompaniesAndUsers = useSelector(selectCompaniesWithUsers);
  return (
    <div className="deverloper-messaging">
      <DeveloperNotificationForm
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
