// Pages/NotificationsPage.tsx
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import "./notificationsPage.css";
import { RootState, useAppDispatch } from "../utils/store";
import {
  markAsRead,
  selectAllNotifications,
} from "../Slices/notificationsSlice";
import NotificationItem from "./Notifications/NotificationItem";
import { useNavigate } from "react-router-dom";
// import { markAllNotificationsRead } from "../Slices/notificationsSlice"; // <-- Create this thunk
import ViewNotificationModal from "./Notifications/ViewNotificationModal";
import { NotificationType } from "../utils/types";
import {
  markNotificationRead,
  removeNotification,
} from "../thunks/notificationsThunks";

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const notifications = useSelector(selectAllNotifications);
  const [selectedNotif, setSelectedNotif] = useState<NotificationType | null>(
    null
  );

  if (!currentUser) return null;

  const handleMarkAllRead = () => {
    notifications.forEach((notif) => {
      if (!notif.readBy?.includes(currentUser.uid)) {
        dispatch(
          markNotificationRead({
            notificationId: notif.id,
            uid: currentUser.uid,
          })
        );
      }
    });
  };

  return (
    <div className="notifications-page">
      <h2>All Notifications</h2>
      <div className="notification-hint-banner">
        <p>
          <strong>Swipe left</strong> to dismiss. <strong>Swipe right</strong>{" "}
          to delete — must be read first.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={() => navigate("/")}>Go Home</button>
        <button onClick={handleMarkAllRead}>Mark All Read</button>
      </div>

      {notifications.map((notif) => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          currentUserId={currentUser.uid}
          onClick={() => {
            if (!notif.readBy?.includes(currentUser.uid)) {
              dispatch(
                markNotificationRead({
                  notificationId: notif.id,
                  uid: currentUser.uid,
                })
              );
            }
            // Open modal to view full details
            setSelectedNotif(notif);
          }}
          onDelete={() => {
            dispatch(removeNotification({ notificationId: notif.id }));
          }}
        />
      ))}

      <ViewNotificationModal
        open={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        notification={selectedNotif}
      />
    </div>
  );
};

export default NotificationsPage;
