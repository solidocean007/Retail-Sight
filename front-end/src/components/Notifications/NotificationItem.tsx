// components/Notifications/NotificationItem.tsx
import React, { useRef, useState } from "react";
import { UserNotificationType } from "../../utils/types";
import "./notifications/notification-item.css";

interface NotificationItemProps {
  notification: UserNotificationType;
  onOpen?: () => void;     // mark read + open
  onDelete?: () => void;   // delete after read
}

const toDate = (value: any): Date => {
  if (!value) return new Date();
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onOpen,
  onDelete,
}) => {
  const isRead = Boolean(notification.readAt);
  const [dismissed, setDismissed] = useState(false);

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
    if (touchStartX.current == null || touchEndX.current == null) return;

    const diff = touchEndX.current - touchStartX.current;

    if (Math.abs(diff) > 50) {
      didSwipe.current = true;
    }

    // Swipe left → open / mark read
    if (diff < -50 && !isRead) {
      setDismissed(true);
      setTimeout(() => {
        onOpen?.();
      }, 250);
    }

    // Swipe right → delete (read only)
    if (diff > 50) {
      if (!isRead) return;
      setDismissed(true);
      setTimeout(() => {
        onDelete?.();
      }, 250);
    }
  };

  return (
    <div
      className={`notification-item ${
        isRead ? "read" : "unread"
      } ${dismissed ? "dismissed" : ""}`}
      onClick={() => {
        if (!didSwipe.current) {
          onOpen?.();
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: "pointer" }}
    >
      <div className="notification-content">
        <div className="notification-title">
          {notification.title}
        </div>

        <p
          className={`notification-body ${
            !isRead ? "truncated" : ""
          }`}
        >
          {notification.message}
        </p>

        {!isRead && (
          <div className="swipe-tip">Swipe to manage</div>
        )}

        <div className="notification-timestamp">
          {toDate(notification.createdAt).toLocaleString()}
        </div>
      </div>

      {!isTouchDevice && isRead && onDelete && (
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
