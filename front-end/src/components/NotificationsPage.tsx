// Pages/NotificationsPage.tsx
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import "./notificationsPage.css";
import { RootState, useAppDispatch } from "../utils/store";
import {
  markAsRead,
  selectAllNotifications,
} from "../Slices/notificationsSlice";
import NotificationItem from "./Notifications/NotificationItem";
import { removeNotification } from "../thunks/notificationsThunks";

const NotificationsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const notifications = useSelector(selectAllNotifications);

  if (!currentUser) return null;

  return (
    <div className="notifications-page">
      <h2>All Notifications</h2>
      <div className="notifications-list">
        {notifications.map((notif) => (
          <NotificationItem
            key={notif.id}
            notification={notif}
            currentUserId={currentUser.uid}
            onClick={() => {
              if (!notif.readBy?.includes(currentUser.uid)) {
                dispatch(markAsRead({ notificationId: notif.id, userId: currentUser.uid }));
              }
              dispatch(removeNotification({ companyId: currentUser.companyId, notificationId: notif.id })); // Argument of type 'AsyncThunkAction<void, { companyId: string; notificationId: string; }, AsyncThunkConfig>' is not assignable to parameter of type 'AnyAction'.ts(2345)
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;
