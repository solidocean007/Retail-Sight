import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { UserNotificationType } from "../utils/types";
import { RootState } from "../utils/store";

interface NotificationsState {
  notifications: UserNotificationType[];
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
    setNotifications(state, action: PayloadAction<UserNotificationType[]>) {
      state.notifications = action.payload;
    },

    // Add a single notification (real-time)
    addNotification(state, action: PayloadAction<UserNotificationType>) {
      state.notifications.unshift(action.payload);
    },

    // Delete a notification
    deleteNotification(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.notifications = state.notifications.filter(
        (n: UserNotificationType) => n.id !== id,
      );
    },
    clearNotifications(state) {
      state.notifications = [];
      state.loading = false;
      state.error = null;
    },
    markAsReadLocal(
      state,
      action: PayloadAction<{ notificationId: string; readAt: string }>,
    ) {
      const notif = state.notifications.find(
        (n) => n.id === action.payload.notificationId,
      );
      if (notif) {
        notif.readAt = action.payload.readAt;
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
  clearNotifications,
  addNotification,
  deleteNotification,
  markAsReadLocal,
  setLoading,
  setError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

//
// Selectors
//

export const selectNotifications = (state: RootState) =>
  state.notifications.notifications;

export const selectUnreadNotifications = createSelector(
  [selectNotifications],
  (notifications) => notifications.filter((n) => !n.readAt),
);
