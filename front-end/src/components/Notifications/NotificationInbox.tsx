import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { CircularProgress } from "@mui/material";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import {
  selectNotifications,
  selectUnreadNotifications,
} from "../../Slices/notificationsSlice";
import { useNotificationActions } from "../../hooks/useNotificationActions";
import { RootState } from "../../utils/store";
import { OpenPostViewerOptions, UserNotificationType } from "../../utils/types";
import CustomConfirmation from "../CustomConfirmation";
import PostViewerModal from "../PostViewerModal";
import NotificationItem from "./NotificationItem";
import ViewNotificationModal from "./ViewNotificationModal";
import {
  getNotificationPostId,
  isCommentNotification,
} from "./utils/notificationHelpers";

import "./notifications/notification-inbox.css";

type NotificationFilter = "all" | "unread" | "activity" | "goals" | "system";

const filters: { value: NotificationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "activity", label: "Activity" },
  { value: "goals", label: "Goals" },
  { value: "system", label: "System" },
];

const matchesFilter = (
  notification: UserNotificationType,
  filter: NotificationFilter,
) => {
  if (filter === "all") return true;
  if (filter === "unread") return !notification.readAt;

  const type = String(notification.type ?? "").toLowerCase();
  if (filter === "goals") return type.includes("goal");
  if (filter === "system") {
    return (
      type.includes("system") ||
      type.includes("announcement") ||
      type.includes("reminder")
    );
  }

  return (
    type.includes("post") ||
    type.includes("comment") ||
    type.includes("like") ||
    type.includes("mention")
  );
};

const NotificationInbox = () => {
  const notifications = useSelector(selectNotifications);
  const unreadNotifications = useSelector(selectUnreadNotifications);
  const loading = useSelector(
    (state: RootState) => state.notifications.loading,
  );
  const error = useSelector((state: RootState) => state.notifications.error);
  const { markRead, markAllRead, markingAllRead, trackClick, remove } =
    useNotificationActions();

  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [selectedNotification, setSelectedNotification] =
    useState<UserNotificationType | null>(null);
  const [notificationToDelete, setNotificationToDelete] =
    useState<UserNotificationType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [postViewerOptions, setPostViewerOptions] =
    useState<OpenPostViewerOptions | null>(null);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) =>
        matchesFilter(notification, filter),
      ),
    [filter, notifications],
  );

  const handleOpen = (notification: UserNotificationType) => {
    void markRead(notification);
    const postId = getNotificationPostId(notification);

    if (postId) {
      void trackClick(notification.id, "modal");
      setPostViewerOptions({
        postId,
        focusCommentId: notification.commentId ?? null,
        openComments: isCommentNotification(notification),
        source: "notification",
      });
      return;
    }

    setSelectedNotification(notification);
  };

  const handleDelete = async () => {
    if (!notificationToDelete || deleting) return;

    setDeleting(true);
    try {
      await remove(notificationToDelete.id);
      setNotificationToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section
      className="notification-inbox"
      aria-labelledby="notification-inbox-title"
    >
      <div className="notification-inbox__toolbar">
        <div>
          <h2 id="notification-inbox-title">Inbox</h2>
          <p>
            {unreadNotifications.length.toLocaleString()} unread ·{" "}
            {notifications.length.toLocaleString()} total
          </p>
        </div>

        <button
          type="button"
          className="notification-inbox__mark-all"
          disabled={unreadNotifications.length === 0 || markingAllRead}
          onClick={() => void markAllRead()}
        >
          {markingAllRead ? (
            <CircularProgress size={14} />
          ) : (
            <DoneAllRoundedIcon />
          )}
          Mark all read
        </button>
      </div>

      <div
        className="notification-inbox__filters"
        aria-label="Filter notifications"
      >
        {filters.map((item) => (
          <button
            type="button"
            key={item.value}
            className={filter === item.value ? "is-active" : ""}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="notification-inbox__state" role="status">
          <CircularProgress size={28} />
          <strong>Loading notifications</strong>
        </div>
      ) : error ? (
        <div className="notification-inbox__state notification-inbox__state--error">
          <NotificationsNoneRoundedIcon />
          <strong>Notifications unavailable</strong>
          <span>{error}</span>
        </div>
      ) : visibleNotifications.length === 0 ? (
        <div className="notification-inbox__state">
          <NotificationsNoneRoundedIcon />
          <strong>
            {notifications.length === 0
              ? "You’re all caught up"
              : "No notifications in this view"}
          </strong>
          <span>
            {notifications.length === 0
              ? "New activity, goal, and system updates will appear here."
              : "Choose another filter to see more notifications."}
          </span>
        </div>
      ) : (
        <div className="notification-inbox__list">
          {visibleNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onOpen={() => handleOpen(notification)}
              onMarkRead={() => void markRead(notification)}
              onDelete={() => setNotificationToDelete(notification)}
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
        open={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        notification={selectedNotification}
        openPostViewer={setPostViewerOptions}
      />

      <CustomConfirmation
        isOpen={Boolean(notificationToDelete)}
        loading={deleting}
        title="Delete notification?"
        message="This removes the notification permanently."
        onClose={() => {
          if (!deleting) setNotificationToDelete(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
};

export default NotificationInbox;
