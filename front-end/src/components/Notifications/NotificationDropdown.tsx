// components/Notifications/NotificationDropdown.tsx
import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { selectAllNotifications } from "../../Slices/notificationsSlice";
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
}> = ({ onClose, 
  openPostViewer
 }) => {
  const dispatch = useAppDispatch(); // ✅ thunk-aware

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const notifications = useSelector(selectAllNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedNotif, setSelectedNotif] = useState<NotificationType | null>(
    null
  );

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
        {/* <button onClick={onClose}>×</button> */}
      </div>
      <div className="dropdown-body">
        {notifications.length === 0 ? (
          <div className="no-notifications">No notifications.</div>
        ) : (
          notifications.slice(0, 5).map((notif) => (
            <div key={notif.id} className="notification-row">
              {/* Dismiss Button */}
              <button
                className="notification-action dismiss"
                onClick={() => {
                  // Optionally filter it from the dropdown only, not Firestore
                  dispatch({
                    type: "notifications/tempDismiss",
                    payload: notif.id,
                  });
                }}
              >
                ↩
              </button>

              {/* Actual Notification */}
              <NotificationItem
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
                  if (notif.postId && openPostViewer) openPostViewer(notif.postId);
                  // Open modal to view full details
                  setSelectedNotif(notif);
                }}
              />

              {/* Delete Button */}
              <button
                className="notification-action delete"
                onClick={() =>
                  dispatch(removeNotification({ notificationId: notif.id }))
                }
              >
                ❌
              </button>
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
