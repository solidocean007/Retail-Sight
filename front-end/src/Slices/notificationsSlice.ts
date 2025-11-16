import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { NotificationType } from "../utils/types";
import { RootState } from "../utils/store";

interface NotificationsState {
  userNotifications: NotificationType[];
  companyNotifications: NotificationType[];
  roleNotifications: NotificationType[];
  loading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  userNotifications: [],
  companyNotifications: [],
  roleNotifications: [],
  loading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    // 🔄 Replace all notifications of each type
    setUserNotifications(state, action: PayloadAction<NotificationType[]>) {
      state.userNotifications = action.payload;
    },
    setCompanyNotifications(state, action: PayloadAction<NotificationType[]>) {
      state.companyNotifications = action.payload;
    },
    setRoleNotifications(state, action: PayloadAction<NotificationType[]>) {
      state.roleNotifications = action.payload;
    },

    // ➕ Add a single notification to the right group
    addUserNotification(state, action: PayloadAction<NotificationType>) {
      state.userNotifications.unshift(action.payload);
    },
    addCompanyNotification(state, action: PayloadAction<NotificationType>) {
      state.companyNotifications.unshift(action.payload);
    },
    addRoleNotification(state, action: PayloadAction<NotificationType>) {
      state.roleNotifications.unshift(action.payload);
    },

    // 🗑️ Remove by ID from all groups
    deleteNotification(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.userNotifications = state.userNotifications.filter((n) => n.id !== id);
      state.companyNotifications = state.companyNotifications.filter((n) => n.id !== id);
      state.roleNotifications = state.roleNotifications.filter((n) => n.id !== id);
    },

    // ✅ Mark as read
    markAsRead(
      state,
      action: PayloadAction<{ notificationId: string; userId: string }>
    ) {
      const { notificationId, userId } = action.payload;
      const mark = (list: NotificationType[]) => {
        const notif = list.find((n) => n.id === notificationId);
        if (notif && !notif.readBy.includes(userId)) {
          notif.readBy.push(userId);
        }
      };
      mark(state.userNotifications);
      mark(state.companyNotifications);
      mark(state.roleNotifications);
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
  setUserNotifications,
  setCompanyNotifications,
  setRoleNotifications,
  addUserNotification,
  addCompanyNotification,
  addRoleNotification,
  deleteNotification,
  markAsRead,
  setLoading,
  setError,
} = notificationsSlice.actions;
export default notificationsSlice.reducer;

//
// 📦 Selectors
//

export const selectUserNotifications = (state: RootState) =>
  state.notifications.userNotifications;

export const selectCompanyNotifications = (state: RootState) =>
  state.notifications.companyNotifications;

export const selectRoleNotifications = (state: RootState) =>
  state.notifications.roleNotifications;

export const selectAllNotifications = createSelector(
  [selectUserNotifications, selectCompanyNotifications, selectRoleNotifications],
  (user, company, role) => [...user, ...company, ...role]
);

export const selectCurrentUserId = (state: RootState) =>
  state.user.currentUser?.uid;

export const selectUnreadNotifications = createSelector(
  [selectAllNotifications, selectCurrentUserId],
  (notifications, uid) =>
    notifications.filter((n) => !n.readBy?.includes(uid ?? ""))
);


// a notification has a sentBy which is a user.  sentBy could also be 'system' though.  