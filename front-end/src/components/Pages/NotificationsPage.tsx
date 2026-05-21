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
import { getFunctions, httpsCallable } from "firebase/functions";
import { OpenPostViewerOptions, UserNotificationType } from "../../utils/types";
import {
  getNotificationPostId,
  isCommentNotification,
} from "../Notifications/utils/notificationHelpers";

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const appReady = useSelector((state: RootState) => state.app.appReady);
  console.log(appReady); // this logs false
  const notifications = useSelector(selectNotifications);
  const [selectedNotif, setSelectedNotif] =
    useState<UserNotificationType | null>(null);
  const [postViewerOptions, setPostViewerOptions] =
    useState<OpenPostViewerOptions | null>(null);
  const functions = getFunctions();
  const markReadCallable = httpsCallable(
    functions,
    "markNotificationReadCallable",
  );
  const trackNotificationClick = httpsCallable(
    functions,
    "trackNotificationClickCallable",
  );

  if (!currentUser) {
    return <div className="page-loading">Loading notifications…</div>;
  }

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
    const targetPostId = getNotificationPostId(notif);

    if (!notif.readAt) {
      await markReadCallable({
        notificationId: notif.id,
      });
    }

    if (targetPostId) {
      await trackNotificationClick({
        notificationId: notif.id,
        source: "modal",
      });

      setPostViewerOptions({
        postId: targetPostId,
        focusCommentId: notif.commentId ?? null,
        openComments: isCommentNotification(notif),
        source: "notification",
      });

      return;
    }

    setSelectedNotif(notif);
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

      <PostViewerModal
        postId={postViewerOptions?.postId ?? null}
        open={Boolean(postViewerOptions?.postId)}
        onClose={() => setPostViewerOptions(null)}
        initialOpenComments={postViewerOptions?.openComments ?? false}
        focusCommentId={postViewerOptions?.focusCommentId ?? null}
      />

      <ViewNotificationModal
        open={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        notification={selectedNotif}
        openPostViewer={setPostViewerOptions}
      />
    </div>
  );
};

export default NotificationsPage;
