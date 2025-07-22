import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { NotificationType } from "../utils/types";

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
    setNotifications(state, action: PayloadAction<NotificationType[]>) {
      state.notifications = action.payload;
    },
    addNotification(state, action: PayloadAction<NotificationType>) {
      state.notifications.unshift(action.payload); // newest first
    },
    updateNotification(state, action: PayloadAction<NotificationType>) {
      const index = state.notifications.findIndex(
        (n) => n.id === action.payload.id
      );
      if (index !== -1) state.notifications[index] = action.payload;
    },
    deleteNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    markAsRead(state, action: PayloadAction<{ notificationId: string; userId: string }>) {
      const notif = state.notifications.find(
        (n) => n.id === action.payload.notificationId
      );
      if (notif && !notif.readBy.includes(action.payload.userId)) {
        notif.readBy.push(action.payload.userId);
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
  updateNotification,
  deleteNotification,
  markAsRead,
  setLoading,
  setError,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
