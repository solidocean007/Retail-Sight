import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DoneRoundedIcon from "@mui/icons-material/DoneRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";

import { UserNotificationType } from "../../utils/types";

import "./notifications/notification-item.css";

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "Recently";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  );

  if (elapsedSeconds < 60) return "Just now";
  if (elapsedSeconds < 3600) {
    const minutes = Math.floor(elapsedSeconds / 60);
    return `${minutes}m ago`;
  }
  if (elapsedSeconds < 86400) {
    const hours = Math.floor(elapsedSeconds / 3600);
    return `${hours}h ago`;
  }
  if (elapsedSeconds < 604800) {
    const days = Math.floor(elapsedSeconds / 86400);
    return `${days}d ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
};

const getNotificationCategory = (notification: UserNotificationType) => {
  const type = String(notification.type ?? "").toLowerCase();

  if (type.includes("comment")) {
    return {
      label: "Comment",
      className: "comment",
      icon: <ChatBubbleOutlineRoundedIcon />,
    };
  }

  if (type.includes("like")) {
    return {
      label: "Like",
      className: "like",
      icon: <FavoriteBorderRoundedIcon />,
    };
  }

  if (type.includes("goal")) {
    return {
      label: "Goal",
      className: "goal",
      icon: <FlagOutlinedIcon />,
    };
  }

  if (type.includes("announcement")) {
    return {
      label: "Announcement",
      className: "announcement",
      icon: <CampaignOutlinedIcon />,
    };
  }

  return {
    label: "Update",
    className: "system",
    icon: <NotificationsNoneRoundedIcon />,
  };
};

type NotificationItemProps = {
  notification: UserNotificationType;
  compact?: boolean;
  showActions?: boolean;
  onOpen?: () => void;
  onMarkRead?: () => void;
  onDelete?: () => void;
};

const NotificationItem = ({
  notification,
  compact = false,
  showActions = true,
  onOpen,
  onMarkRead,
  onDelete,
}: NotificationItemProps) => {
  const isRead = Boolean(notification.readAt);
  const category = getNotificationCategory(notification);

  return (
    <article
      className={`notification-item notification-item--${category.className} ${
        isRead ? "is-read" : "is-unread"
      } ${compact ? "is-compact" : ""}`}
    >
      <button
        type="button"
        className="notification-item__main"
        onClick={onOpen}
        aria-label={`${isRead ? "" : "Unread notification: "}${notification.title}`}
      >
        <span className="notification-item__icon" aria-hidden="true">
          {category.icon}
        </span>

        <span className="notification-item__content">
          <span className="notification-item__meta">
            <span>{category.label}</span>
            <time>{formatRelativeTime(notification.createdAt)}</time>
          </span>
          <strong>{notification.title}</strong>
          <span className="notification-item__message">
            {notification.message}
          </span>
        </span>

        {!isRead && (
          <span className="notification-item__unread-dot" aria-label="Unread" />
        )}
        <ChevronRightRoundedIcon
          className="notification-item__chevron"
          aria-hidden="true"
        />
      </button>

      {showActions && (
        <div className="notification-item__actions">
          {!isRead && onMarkRead && (
            <button type="button" onClick={onMarkRead}>
              <DoneRoundedIcon />
              Mark read
            </button>
          )}
          {isRead && onDelete && (
            <button
              type="button"
              className="notification-item__delete"
              onClick={onDelete}
            >
              <DeleteOutlineRoundedIcon />
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
};

export default NotificationItem;
