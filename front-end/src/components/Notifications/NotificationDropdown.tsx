// components/Notifications/NotificationDropdown.tsx
import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { selectNotifications } from "../../Slices/notificationsSlice";
import NotificationItem from "./NotificationItem";
import "./notifications/notification-dropdown.css";
import { useOutsideAlerter } from "../../utils/useOutsideAlerter";
import {
  markNotificationRead,
  removeNotification,
} from "../../thunks/notificationsThunks";
import ViewNotificationModal from "./ViewNotificationModal";
import { NotificationType } from "../../utils/types";

const NotificationDropdown: React.FC<{
  onClose: () => void;
  openPostViewer?: (postId: string) => void;
}> = ({ onClose, openPostViewer }) => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((s: RootState) => s.user.currentUser);
  const notifications = useSelector(selectNotifications);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedNotif, setSelectedNotif] =
    useState<NotificationType | null>(null);

  useOutsideAlerter(dropdownRef, onClose);

  if (!currentUser) return null;

  const handleOpen = (notif: NotificationType) => {
    if (!notif.readBy?.includes(currentUser.uid)) {
      dispatch(
        markNotificationRead({
          notificationId: notif.id,
          uid: currentUser.uid,
        }),
      );
    }

    if (notif.postId && openPostViewer) {
      openPostViewer(notif.postId);
    } else {
      setSelectedNotif(notif);
    }
  };

  const handleDelete = (id: string) => {
    dispatch(removeNotification({ notificationId: id }));
  };

  return (
    <div
      ref={dropdownRef}
      className="notification-dropdown"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="dropdown-header">
        <h4>Notifications</h4>
      </div>

      <div className="dropdown-body">
        {notifications.length === 0 ? (
          <div className="no-notifications">No notifications.</div>
        ) : (
          notifications.slice(0, 5).map((notif) => (
            <div key={notif.id} className="notification-row">
              <NotificationItem
                notification={notif}
                currentUserId={currentUser.uid}
                onClick={() => handleOpen(notif)}
                onDelete={() => handleDelete(notif.id)}
              />
            </div>
          ))
        )}
      </div>

      <ViewNotificationModal
        open={!!selectedNotif}
        onClose={() => setSelectedNotif(null)}
        notification={selectedNotif}
        openPostViewer={openPostViewer}
      />
    </div>
  );
};

export default NotificationDropdown;