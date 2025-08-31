// components/Notifications/NotificationItem.tsx
import React, { useRef, useState } from "react";
import { NotificationType } from "../../utils/types";
import "./notifications/notification-item.css";
import { Timestamp } from "@firebase/firestore";

interface NotificationItemProps {
  notification: NotificationType;
  currentUserId: string;
  onClick?: () => void;
  openPostViewer?: () => void;
  onDelete?: () => void; // 👈 add this
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  currentUserId,
  onClick,
  onDelete,
}) => {
  const isUnread = !notification.readBy?.includes(currentUserId);
  const [dismissed, setDismissed] = useState(false);
  const priorityClass = notification.priority?.toLowerCase() || "normal";

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;

    if (touchStartX.current === null || touchEndX.current === null) return;

    const diff = touchEndX.current - touchStartX.current;

    if (diff < -50) {
      // Swipe left → Dismiss
      setDismissed(true);
      setTimeout(() => {
        onClick?.();
      }, 300);
    }

    if (diff > 50) {
      // Swipe right → Delete only if read
      if (!notification.readBy?.includes(currentUserId)) {
        alert("Mark as read before deleting.");
        return;
      }

      setDismissed(true);
      setTimeout(() => {
        onDelete?.(); // 👈 needs to be passed from parent
      }, 300);
    }
  };

  return (
    <div
      className={`notification-item ${priorityClass} ${
        isUnread ? "unread" : "read"
      } ${dismissed ? "dismissed" : ""}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: "pointer" }} // 👈 Add this
    >
      <div className="notification-title">{notification.title}</div>
      <div className="notification-message">{notification.message}</div>
      {isUnread && <div className="swipe-tip">Swipe to manage</div>}

      <div className="notification-timestamp">
        {new Date(
          notification.sentAt instanceof Timestamp
            ? notification.sentAt.toDate()
            : notification.sentAt
        ).toLocaleString()}
      </div>
      {notification.postId && (
        <button
          className="button-primary"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
        >
          View Post
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
