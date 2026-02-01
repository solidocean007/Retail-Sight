import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DeveloperNotificationType } from "../utils/types";
import { RootState } from "../utils/store";
import { fetchDeveloperNotifications } from "../thunks/developerNotificationsThunks";

interface DeveloperNotificationsState {
  items: DeveloperNotificationType[];
  loading: boolean;
  error: string | null;
}

const initialState: DeveloperNotificationsState = {
  items: [],
  loading: false,
  error: null,
};

export const developerNotificationsSlice = createSlice({
  name: "developerNotifications",
  initialState,
  reducers: {
    setDeveloperNotifications(
      state,
      action: PayloadAction<DeveloperNotificationType[]>,
    ) {
      state.items = action.payload;
    },
    addDeveloperNotification(
      state,
      action: PayloadAction<DeveloperNotificationType>,
    ) {
      state.items.unshift(action.payload);
    },

    removeDeveloperNotification(state, action: PayloadAction<string>) {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },

    clearDeveloperNotifications(state) {
      state.items = [];
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDeveloperNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeveloperNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchDeveloperNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to load notifications";
      });
  },
});

export const selectDeveloperNotifications = (state: RootState) =>
  state.developerNotifications.items;

export const selectDeveloperNotificationsLoading = (state: RootState) =>
  state.developerNotifications.loading;

export const selectDeveloperNotificationsError = (state: RootState) =>
  state.developerNotifications.error;

export const {
  setDeveloperNotifications,
  addDeveloperNotification,
  removeDeveloperNotification,
  clearDeveloperNotifications,
} = developerNotificationsSlice.actions;

export default developerNotificationsSlice.reducer;
