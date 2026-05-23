// DeveloperMessaging.tsx
import { useSelector } from "react-redux";
import { UserType } from "../../utils/types";
import DeveloperNotificationForm from "./DeveloperNotificationForm";
import { selectCompaniesWithUsers } from "../../Slices/allCompaniesSlice";
import { selectUser } from "../../Slices/userSlice";
import DeveloperNotificationsTable from "./DeveloperNotificationsTable";
import "./developerMessaging.css";

const DeveloperMessaging = () => {
  const dashboardUser = useSelector(selectUser);
  const allCompaniesAndUsers = useSelector(selectCompaniesWithUsers);

  return (
    <section className="developer-messaging-page">
      <header className="developer-messaging-header">
        <h1>Developer Messaging</h1>
        <p>
          Send in-app and email updates to selected companies, roles, or users.
        </p>
      </header>

      <div className="developer-messaging-grid">
        <section className="developer-messaging-card">
          <h2>Create Message</h2>
          <DeveloperNotificationForm
            currentUser={dashboardUser as UserType}
            allCompaniesAndUsers={allCompaniesAndUsers}
          />
        </section>

        <section className="developer-messaging-card">
          <DeveloperNotificationsTable
            allCompaniesAndUsers={allCompaniesAndUsers}
          />
        </section>
      </div>
    </section>
  );
};

export default DeveloperMessaging;