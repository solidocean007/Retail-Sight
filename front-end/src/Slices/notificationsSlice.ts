import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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
    setNotifications(state, action: PayloadAction<NotificationType[]>) {
      state.notifications = action.payload;
    },
    addNotification: (state, action) => {
      const exists = state.notifications.find(
        (n) => n.id === action.payload.id
      );
      if (!exists) {
        state.notifications.unshift(action.payload);
      }
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
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    togglePinNotification: (state, action) => {
      const notif = state.notifications.find((n) => n.id === action.payload);
      if (notif) notif.pinned = !notif.pinned;
    },
    markAsRead(
      state,
      action: PayloadAction<{ notificationId: string; userId: string }>
    ) {
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



export const selectAllNotifications = (state: RootState) => state.notifications.notifications;
export const selectUnreadNotifications = (state: RootState) => {
  const uid = state.user.currentUser?.uid;
  if (!uid) return [];
  return state.notifications.notifications.filter((n) => !n.readBy?.includes(uid));
};


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
