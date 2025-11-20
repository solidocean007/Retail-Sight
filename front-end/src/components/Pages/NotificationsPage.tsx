// Pages/NotificationsPage.tsx
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import "./notificationsPage.css";
import { RootState, useAppDispatch } from "../../utils/store";
import {
  markAsRead,
  selectAllNotifications,
} from "../../Slices/notificationsSlice";
import NotificationItem from "../Notifications/NotificationItem";
import { useNavigate } from "react-router-dom";
// import { markAllNotificationsRead } from "../Slices/notificationsSlice"; // <-- Create this thunk
import ViewNotificationModal from "../Notifications/ViewNotificationModal";
import { NotificationType } from "../../utils/types";
import {
  markNotificationRead,
  removeNotification,
} from "../../thunks/notificationsThunks";
import PostViewerModal from "../PostViewerModal";

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const notifications = useSelector(selectAllNotifications);
  const [selectedNotif, setSelectedNotif] = useState<NotificationType | null>(
    null
  );
  const [postIdToView, setPostIdToView] = useState<string | null>(null);

  if (!currentUser) return null;

  useEffect(()=> {
    if(notifications.length === 0) {
      navigate("/");
    } 
  },[notifications])

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
          <span role="img" aria-label="left">
            👈
          </span>{" "}
          <strong>Swipe left</strong> to dismiss.
          <span role="img" aria-label="right">
            👉
          </span>{" "}
          <strong>Swipe right</strong> to delete.
        </p>
      </div>

      <div className="notifications-actions">
        <button className="button-primary" onClick={() => navigate("/")}>
          Close
        </button>
        <button className="button-primary" onClick={handleMarkAllRead}>
          Mark All Read
        </button>
      </div>

      {notifications.length > 0 && (
        <div className="notifications-card">
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

                if (notif.postId) {
                  setPostIdToView(notif.postId);
                } else {
                  setSelectedNotif(notif);
                }
              }}
              onDelete={() => {
                dispatch(removeNotification({ notificationId: notif.id }));
              }}
            />
          ))}
        </div>
      )}

      {postIdToView && (
        <PostViewerModal
          key={postIdToView}
          postId={postIdToView}
          open={!!postIdToView}
          onClose={() => setPostIdToView(null)}
          currentUserUid={currentUser?.uid}
        />
      )}

      <ViewNotificationModal
        open={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        notification={selectedNotif}
      />
    </div>
  );
};

export default NotificationsPage;
