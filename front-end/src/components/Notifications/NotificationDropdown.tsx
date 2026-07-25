import React, { useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { getFunctions, httpsCallable } from "firebase/functions";

import { RootState, useAppDispatch } from "../../utils/store";
import { selectNotifications } from "../../Slices/notificationsSlice";
import { removeNotification } from "../../thunks/notificationsThunks";
import { OpenPostViewerOptions, UserNotificationType } from "../../utils/types";
import { useOutsideAlerter } from "../../utils/useOutsideAlerter";

import NotificationItem from "./NotificationItem";
import ViewNotificationModal from "./ViewNotificationModal";
import "./notifications/notification-dropdown.css";
import {
  getNotificationPostId,
  isCommentNotification,
} from "./utils/notificationHelpers";

interface NotificationDropdownProps {
  onClose: () => void;
  openPostViewer?: (options: OpenPostViewerOptions) => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  onClose,
  openPostViewer,
}) => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((s: RootState) => s.user.currentUser);
  const notifications = useSelector(selectNotifications);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedNotif, setSelectedNotif] =
    useState<UserNotificationType | null>(null);

  const functions = useMemo(() => getFunctions(), []);

  const markReadCallable = useMemo(
    () => httpsCallable(functions, "markNotificationReadCallable"),
    [functions],
  );

  const trackNotificationClick = useMemo(
    () => httpsCallable(functions, "trackNotificationClickCallable"),
    [functions],
  );

  useOutsideAlerter(dropdownRef, onClose);

  if (!currentUser) return null;

  const handleOpen = (notif: UserNotificationType) => {
    const targetPostId = getNotificationPostId(notif);

    // Fire-and-forget: never block opening on analytics/mark-read
    if (!notif.readAt) {
      markReadCallable({ notificationId: notif.id }).catch((err) =>
        console.error("markNotificationRead failed:", err),
      );
    }

    trackNotificationClick({
      notificationId: notif.id,
      source: "dropdown",
    }).catch((err) =>
      console.error("trackNotificationClick failed:", err),
    );

    if (targetPostId && openPostViewer) {
      openPostViewer({
        postId: targetPostId,
        focusCommentId: notif.commentId ?? null,
        openComments: isCommentNotification(notif),
        source: "notification",
      });

      onClose();
      return;
    }

    setSelectedNotif(notif);
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
          <div className="notification-empty-state">No notifications yet.</div>
        ) : (
          notifications.slice(0, 5).map((notif) => (
            <div key={notif.id} className="notification-row">
              <NotificationItem
                notification={notif}
                onOpen={() => handleOpen(notif)}
                onDelete={() =>
                  dispatch(removeNotification({ notificationId: notif.id }))
                }
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
