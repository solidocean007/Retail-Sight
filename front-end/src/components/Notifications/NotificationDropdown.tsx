import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import { CircularProgress } from "@mui/material";
import { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import {
  selectNotifications,
  selectUnreadNotifications,
} from "../../Slices/notificationsSlice";
import { useNotificationActions } from "../../hooks/useNotificationActions";
import { useOutsideAlerter } from "../../utils/useOutsideAlerter";
import { OpenPostViewerOptions, UserNotificationType } from "../../utils/types";
import { RootState } from "../../utils/store";
import NotificationItem from "./NotificationItem";
import ViewNotificationModal from "./ViewNotificationModal";
import {
  getNotificationPostId,
  isCommentNotification,
} from "./utils/notificationHelpers";

import "./notifications/notification-dropdown.css";

type NotificationDropdownProps = {
  onClose: () => void;
  openPostViewer?: (options: OpenPostViewerOptions) => void;
};

const NotificationDropdown = ({
  onClose,
  openPostViewer,
}: NotificationDropdownProps) => {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const notifications = useSelector(selectNotifications);
  const unread = useSelector(selectUnreadNotifications);
  const { markRead, markAllRead, markingAllRead, trackClick } =
    useNotificationActions();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<UserNotificationType | null>(null);

  useOutsideAlerter(dropdownRef, onClose);

  if (!currentUser) return null;

  const handleOpen = (notification: UserNotificationType) => {
    void markRead(notification);
    const postId = getNotificationPostId(notification);

    if (postId) {
      void trackClick(notification.id, "dropdown");
      const options: OpenPostViewerOptions = {
        postId,
        focusCommentId: notification.commentId ?? null,
        openComments: isCommentNotification(notification),
        source: "notification",
      };

      if (openPostViewer) {
        openPostViewer(options);
      } else {
        navigate(`/post/${postId}`);
      }

      onClose();
      return;
    }

    setSelectedNotification(notification);
  };

  const openNotificationCenter = (tab: "inbox" | "preferences") => {
    sessionStorage.setItem("notificationCenterTab", tab);
    sessionStorage.setItem("dashboardMode", "NotificationsMode");
    navigate("/dashboard");
    onClose();
  };

  return (
    <div
      ref={dropdownRef}
      className="notification-dropdown"
      role="dialog"
      aria-label="Recent notifications"
    >
      <div className="notification-dropdown__header">
        <div>
          <h2>Notifications</h2>
          <p>
            {unread.length > 0
              ? `${unread.length} unread`
              : "You’re all caught up"}
          </p>
        </div>
        <button
          type="button"
          disabled={unread.length === 0 || markingAllRead}
          onClick={() => void markAllRead()}
        >
          {markingAllRead ? (
            <CircularProgress size={13} />
          ) : (
            <DoneAllRoundedIcon />
          )}
          Mark all read
        </button>
      </div>

      <div className="notification-dropdown__body">
        {notifications.length === 0 ? (
          <div className="notification-dropdown__empty">
            <strong>No notifications yet</strong>
            <span>Activity and goal updates will appear here.</span>
          </div>
        ) : (
          notifications
            .slice(0, 5)
            .map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                compact
                showActions={false}
                onOpen={() => handleOpen(notification)}
              />
            ))
        )}
      </div>

      <div className="notification-dropdown__footer">
        <button type="button" onClick={() => openNotificationCenter("inbox")}>
          <OpenInNewRoundedIcon />
          View all
        </button>
        <button
          type="button"
          onClick={() => openNotificationCenter("preferences")}
        >
          <SettingsOutlinedIcon />
          Preferences
        </button>
      </div>

      <ViewNotificationModal
        open={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        notification={selectedNotification}
        openPostViewer={openPostViewer}
      />
    </div>
  );
};

export default NotificationDropdown;
