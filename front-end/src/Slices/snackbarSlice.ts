import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SnackbarMessage {
  text: string;
  duration?: number;
}

interface SnackbarState {
  queue: SnackbarMessage[];
  current: SnackbarMessage | null;
  open: boolean;
}

const initialState: SnackbarState = {
  queue: [],
  current: null,
  open: false,
};

const snackbarSlice = createSlice({
  name: "snackbar",
  initialState,
  reducers: {
    showMessage: (state, action: PayloadAction<string | SnackbarMessage>) => {
      const newMessage: SnackbarMessage =
        typeof action.payload === "string"
          ? { text: action.payload }
          : action.payload;

      if (state.open || state.current) {
        state.queue.push(newMessage);
      } else {
        state.current = newMessage;
        state.open = true;
      }
    },
    hideMessage: (state) => {
      state.open = false;
    },
    nextMessage: (state) => {
      if (state.queue.length > 0) {
        state.current = state.queue.shift() || null;
        state.open = true;
      } else {
        state.current = null;
        state.open = false;
      }
    },
  },
});

export const { showMessage, hideMessage, nextMessage } = snackbarSlice.actions;
export default snackbarSlice.reducer;
