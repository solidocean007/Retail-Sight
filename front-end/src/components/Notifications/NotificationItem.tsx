// components/Notifications/NotificationItem.tsx
import React, { useRef, useState } from "react";
import { NotificationType } from "../../utils/types";
import "./notifications/notification-item.css";

interface NotificationItemProps {
  notification: NotificationType;
  currentUserId: string;
  onClick?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  currentUserId,
  onClick,
}) => {
  const isUnread = !notification.readBy?.includes(currentUserId);
  const [dismissed, setDismissed] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    if (
      touchStartX.current !== null &&
      touchEndX.current !== null &&
      touchStartX.current - touchEndX.current > 50
    ) {
      // Swipe left detected
      setDismissed(true);
      setTimeout(() => {
        onClick?.();
      }, 300); // match CSS animation duration
    }
  };

  return (
    <div
      className={`notification-item ${isUnread ? "unread" : "read"} ${dismissed ? "dismissed" : ""}`}
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="notification-title">{notification.title}</div>
      <div className="notification-message">{notification.message}</div>
      <div className="notification-timestamp">
        {new Date(notification.sentAt.seconds * 1000).toLocaleString()}
      </div>
    </div>
  );
};

export default NotificationItem;