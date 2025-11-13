// Slices/appSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AppState = {
  appReady: boolean;
  resetting: boolean;
  localVersion: string | null;
  serverVersion: string | null;
  loadingMessage: string | null;
};

const initialState: AppState = {
  appReady: false,
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
    setResetting(state, action: PayloadAction<boolean>) {
      state.resetting = action.payload;
    },
    setVersions(
      state,
      action: PayloadAction<{ localVersion: string | null; serverVersion: string | null }>
    ) {
      state.localVersion = action.payload.localVersion;
      state.serverVersion = action.payload.serverVersion;
    },
     setLoadingMessage(state, action: PayloadAction<string | null>) {  // ⬅ NEW
      state.loadingMessage = action.payload;
    }
  },
});

export const { setAppReady, setResetting, setVersions, setLoadingMessage } = appSlice.actions;
export default appSlice.reducer;
