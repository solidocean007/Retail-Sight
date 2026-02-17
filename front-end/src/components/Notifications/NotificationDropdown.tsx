// components/Notifications/NotificationDropdown.tsx
import React, { useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState, useAppDispatch } from "../../utils/store";
import { selectNotifications } from "../../Slices/notificationsSlice";
import NotificationItem from "./NotificationItem";
import "./notifications/notification-dropdown.css";
import { useOutsideAlerter } from "../../utils/useOutsideAlerter";
import { removeNotification } from "../../thunks/notificationsThunks";
import ViewNotificationModal from "./ViewNotificationModal";
import { UserNotificationType } from "../../utils/types";
import { getFunctions, httpsCallable } from "firebase/functions";

const NotificationDropdown: React.FC<{
  onClose: () => void;
  openPostViewer?: (postId: string) => void;
}> = ({ onClose, openPostViewer }) => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((s: RootState) => s.user.currentUser);
  const notifications = useSelector(selectNotifications);
  const functions = getFunctions();
  const markReadCallable = httpsCallable(
    functions,
    "markNotificationReadCallable",
  );
  const trackNotificationClick = httpsCallable(
    functions,
    "trackNotificationClickCallable",
  );

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedNotif, setSelectedNotif] =
    useState<UserNotificationType | null>(null);

  useOutsideAlerter(dropdownRef, onClose);

  if (!currentUser) return null;

  const handleOpen = async (notif: UserNotificationType) => {
    if (!notif.readAt) {
      await markReadCallable({
        notificationId: notif.id,
      });
    }

    if (notif.postId && openPostViewer) {
      await trackNotificationClick({
        notificationId: notif.id,
        source: "dropdown",
      });
      openPostViewer(notif.postId);
    } else {
      await trackNotificationClick({
        notificationId: notif.id,
        source: "dropdown",
      });
      setSelectedNotif(notif);
    }
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
        {notifications.slice(0, 5).map((notif) => (
          <div key={notif.id} className="notification-row">
            <NotificationItem
              notification={notif}
              onOpen={() => handleOpen(notif)}
              onDelete={() =>
                dispatch(removeNotification({ notificationId: notif.id }))
              }
            />
          </div>
        ))}
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
