import HeaderBar from "../HeaderBar";
import NotificationCenter from "../Notifications/NotificationCenter";

import "./notificationsPage.css";

const NotificationsPage = () => (
  <div className="notifications-route">
    <HeaderBar toggleFilterMenu={() => undefined} />
    <NotificationCenter initialTab="inbox" />
  </div>
);

export default NotificationsPage;
