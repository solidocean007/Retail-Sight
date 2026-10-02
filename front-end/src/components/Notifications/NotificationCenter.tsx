import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { selectUnreadNotifications } from "../../Slices/notificationsSlice";
import NotificationInbox from "./NotificationInbox";
import NotificationSettingsPanel from "./NotificationSettingsPanel";

import "./notificationCenter.css";

type NotificationCenterTab = "inbox" | "preferences";

type NotificationCenterProps = {
  initialTab?: NotificationCenterTab;
};

const NotificationCenter = ({
  initialTab = "inbox",
}: NotificationCenterProps) => {
  const unread = useSelector(selectUnreadNotifications);
  const [activeTab, setActiveTab] = useState<NotificationCenterTab>(initialTab);

  useEffect(() => {
    const requestedTab = sessionStorage.getItem("notificationCenterTab");
    if (requestedTab === "inbox" || requestedTab === "preferences") {
      setActiveTab(requestedTab);
    }
    sessionStorage.removeItem("notificationCenterTab");
  }, []);

  return (
    <main className="notification-center">
      <header className="notification-center__header">
        <div className="notification-center__identity">
          <span className="notification-center__mark" aria-hidden="true">
            <NotificationsNoneOutlinedIcon />
          </span>
          <div>
            <span className="notification-center__eyebrow">Workspace</span>
            <h1>Notifications</h1>
            <p>Review activity and control how Displaygram reaches you.</p>
          </div>
        </div>
        {unread.length > 0 && (
          <span className="notification-center__unread">
            {unread.length.toLocaleString()} unread
          </span>
        )}
      </header>

      <section className="notification-center__panel">
        <div className="notification-center__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "inbox"}
            className={activeTab === "inbox" ? "is-active" : ""}
            onClick={() => setActiveTab("inbox")}
          >
            <NotificationsNoneOutlinedIcon />
            Inbox
            {unread.length > 0 && <span>{unread.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "preferences"}
            className={activeTab === "preferences" ? "is-active" : ""}
            onClick={() => setActiveTab("preferences")}
          >
            <TuneRoundedIcon />
            Preferences
          </button>
        </div>

        <div className="notification-center__content">
          {activeTab === "inbox" ? (
            <NotificationInbox />
          ) : (
            <NotificationSettingsPanel />
          )}
        </div>
      </section>
    </main>
  );
};

export default NotificationCenter;
