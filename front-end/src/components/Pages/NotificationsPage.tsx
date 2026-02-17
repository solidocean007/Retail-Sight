// Pages/NotificationsPage.tsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import "./notificationsPage.css";
import { RootState, useAppDispatch } from "../../utils/store";
import { selectNotifications } from "../../Slices/notificationsSlice";
import NotificationItem from "../Notifications/NotificationItem";
import { useNavigate } from "react-router-dom";
// import { markAllNotificationsRead } from "../Slices/notificationsSlice"; // <-- Create this thunk
import ViewNotificationModal from "../Notifications/ViewNotificationModal";
import { removeNotification } from "../../thunks/notificationsThunks";
import PostViewerModal from "../PostViewerModal";
import { UserNotificationType } from "../../utils/types";
import { getFunctions, httpsCallable } from "firebase/functions";

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const appReady = useSelector((state: RootState) => state.app.appReady);

  const notifications = useSelector(selectNotifications);
  const [selectedNotif, setSelectedNotif] =
    useState<UserNotificationType | null>(null);
  const [postIdToView, setPostIdToView] = useState<string | null>(null);
  const functions = getFunctions();
  const markReadCallable = httpsCallable(
    functions,
    "markNotificationReadCallable",
  );
  const trackNotificationClick = httpsCallable(
    functions,
    "trackNotificationClickCallable",
  );

  if (!currentUser || !appReady) {
    return <div className="page-loading">Loading notifications…</div>;
  }

  console.log("notifications page");
  //   useEffect(() => {
  //   // Only redirect if we KNOW notifications have loaded
  //   if (!currentUser) return;

  //   if (notifications.length === 0) {
  //     // give hydration time on cold start
  //     const t = setTimeout(() => {
  //       if (notifications.length === 0) {
  //         navigate("/");
  //       }
  //     }, 500);

  //     return () => clearTimeout(t);
  //   }
  // }, [notifications, currentUser, navigate]);

  const handleMarkAllRead = async () => {
    for (const notif of notifications) {
      if (!notif.readAt) {
        await markReadCallable({
          notificationId: notif.id,
        });
      }
    }
  };

  const handleOpen = async (notif: UserNotificationType) => {
    if (!notif.readAt) {
      await markReadCallable({
        notificationId: notif.id,
      });
    }

    if (notif.postId) {
      await trackNotificationClick({
        notificationId: notif.id,
        source: "modal",
      });
      setPostIdToView(notif.postId);
    } else {
      setSelectedNotif(notif);
    }
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
              onOpen={() => handleOpen(notif)}
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
