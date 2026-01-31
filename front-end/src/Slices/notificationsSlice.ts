import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { NotificationType } from "../utils/types";
import { RootState } from "../utils/store";


interface NotificationsState {
  notifications: NotificationType[];
  loading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  notifications: [],
  loading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // Replace all notifications for the current user
    setNotifications(state, action: PayloadAction<NotificationType[]>) {
      state.notifications = action.payload;
    },

    // Add a single notification (real-time)
    addNotification(state, action: PayloadAction<NotificationType>) {
      state.notifications.unshift(action.payload);
    },

    // Delete a notification
    deleteNotification(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.notifications = state.notifications.filter((n) => n.id !== id);
    },

    // Mark as read
    markAsRead(
      state,
      action: PayloadAction<{ notificationId: string; userId: string }>
    ) {
      const { notificationId, userId } = action.payload;
      const notif = state.notifications.find((n) => n.id === notificationId);
      if (notif && !notif.readBy.includes(userId)) {
        notif.readBy.push(userId);
      }
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  deleteNotification,
  markAsRead,
  setLoading,
  setError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

//
// Selectors
//

export const selectNotifications = (state: RootState) =>
  state.notifications.notifications;

export const selectCurrentUserId = (state: RootState) =>
  state.user.currentUser?.uid;

export const selectUnreadNotifications = createSelector(
  [selectNotifications, selectCurrentUserId],
  (notifications, uid) =>
    notifications.filter((n) => !n.readBy?.includes(uid ?? ""))
);
