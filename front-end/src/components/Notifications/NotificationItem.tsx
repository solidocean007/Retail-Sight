// components/Notifications/NotificationItem.tsx
import React, { useRef, useState } from "react";
import { NotificationType } from "../../utils/types";
import "./notifications/notification-item.css";

interface NotificationItemProps {
  notification: NotificationType;
  currentUserId: string;
  onClick?: () => void;
  openPostViewer?: () => void;
  onDelete?: () => void; // 👈 add this
}

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
};

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
  const didSwipe = useRef(false);

  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const handleTouchStart = (e: React.TouchEvent) => {
    didSwipe.current = false;
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    if (touchStartX.current === null || touchEndX.current === null) return;

    const diff = touchEndX.current - touchStartX.current;

    if (Math.abs(diff) > 50) {
      didSwipe.current = true;
    }

    if (diff < -50) {
      // Swipe left → Mark read only
      if (isUnread) {
        setDismissed(true);
        setTimeout(() => {
          onClick?.(); // mark read happens in parent
        }, 300);
      }
    }

    if (diff > 50) {
      // Swipe right → Delete (read only)
      if (isUnread) {
        alert("Mark as read before deleting.");
        return;
      }

      setDismissed(true);
      setTimeout(() => {
        onDelete?.();
      }, 300);
    }
  };

  return (
    <div
      className={`notification-item ${priorityClass} ${
        isUnread ? "unread" : "read"
      } ${dismissed ? "dismissed" : ""}`}
      onClick={() => {
        if (!didSwipe.current) onClick?.();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: "pointer" }} // 👈 Add this
    >
      <div>
        <div className="notification-title">{notification.title}</div>
        <div className="notification-message">{notification.message}</div>
        {isUnread && <div className="swipe-tip">Swipe to manage</div>}

        <div className="notification-timestamp">
          {toDate(notification.sentAt).toLocaleString()}
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

      {!isTouchDevice && !isUnread && onDelete && (
        <button
          className="notification-delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Delete notification"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
