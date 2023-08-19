// snackbarSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SnackbarState {
  open: boolean;
  message: string;
}

const initialState: SnackbarState = {
  open: false,
  message: '',
};

const snackbarSlice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    showMessage: (state, action: PayloadAction<string>) => {
      state.message = action.payload;
      state.open = true;
    },
    hideMessage: (state) => {
      state.open = false;
      state.message = '';
    },
  },
});

export const { showMessage, hideMessage } = snackbarSlice.actions;

export default snackbarSlice.reducer;
