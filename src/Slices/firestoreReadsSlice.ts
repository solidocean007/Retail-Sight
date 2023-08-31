//firestoreReadsSlice.ts
import { createSlice } from "@reduxjs/toolkit";

export const firestoreReadsSlice = createSlice({
  name: "firestoreReads",
  initialState: {
    count: 0,
    maxCount: 100,
  },
  reducers: {
    incrementRead: (state) => {
      state.count += 1;
    },
    resetReads: (state) => {
      state.count = 0;
    },
  },
});

export const { incrementRead, resetReads } = firestoreReadsSlice.actions;
export default firestoreReadsSlice.reducer;
