// components/Notifications/NotificationDropdown.tsx
import React, { useRef } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { selectAllNotifications } from "../../Slices/notificationsSlice";
import NotificationItem from "./NotificationItem";
import "./notifications/notification-dropdown.css";
import { useOutsideAlerter } from "../../utils/useOutsideAlerter";
import { markNotificationRead } from "../../thunks/notificationsThunks";

const NotificationDropdown: React.FC<{
  onClose: () => void;
  openPostViewer: (postId: string) => void;
}> = ({ onClose, openPostViewer }) => {
  const dispatch = useAppDispatch(); // ✅ thunk-aware

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const notifications = useSelector(selectAllNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideAlerter(dropdownRef, onClose);

  if (!currentUser) return null;

  return (
    <div
      className="notification-dropdown"
      ref={dropdownRef}
      role="dialog"
      aria-label="Notifications"
    >
      <div className="dropdown-header">
        <h4>Notifications</h4>
        <button onClick={onClose}>×</button>
      </div>
      <div className="dropdown-body">
        {notifications.length === 0 ? (
          <div className="no-notifications">No notifications.</div>
        ) : (
          notifications.slice(0, 5).map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              currentUserId={currentUser.uid}
              onClick={() => {
                if (!notif.readBy?.includes(currentUser.uid)) {
                  dispatch(
                    markNotificationRead({
                      notificationId: notif.id,
                      uid: currentUser.uid,
                    })
                  );
                }
                if (notif.postId) openPostViewer(notif.postId); // 👈 NEW
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationDropdown;
