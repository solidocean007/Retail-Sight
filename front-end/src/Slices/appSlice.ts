// Slices/appSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AppState = {
  appReady: boolean;      // global bootstrap finished
  feedReady: boolean;     // feed finished its first load
  resetting: boolean;
  localVersion: string | null;
  serverVersion: string | null;
  loadingMessage: string | null;
};

const initialState: AppState = {
  appReady: false,
  feedReady: false,
  resetting: false,
  localVersion: null,
  serverVersion: null,
  loadingMessage: null,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setAppReady(state, action: PayloadAction<boolean>) {
      state.appReady = action.payload;
    },
    setFeedReady(state, action: PayloadAction<boolean>) {
      state.feedReady = action.payload;    // ✅ FIXED
    },
    setResetting(state, action: PayloadAction<boolean>) {
      state.resetting = action.payload;
    },
    setVersions(
      state,
      action: PayloadAction<{
        localVersion: string | null;
        serverVersion: string | null;
      }>
    ) {
      state.localVersion = action.payload.localVersion;
      state.serverVersion = action.payload.serverVersion;
    },
    setLoadingMessage(state, action: PayloadAction<string | null>) {
      state.loadingMessage = action.payload;
    },
  },
});

export const {
  setAppReady,
  setFeedReady,
  setResetting,
  setVersions,
  setLoadingMessage,
} = appSlice.actions;

export default appSlice.reducer;
