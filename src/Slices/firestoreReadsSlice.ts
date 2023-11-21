//firestoreReadsSlice.ts
// import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// export const firestoreReadsSlice = createSlice({
//   name: "firestoreReads",
//   initialState: {
//     count: 0,
//     maxCount: 100,
//   },
//   reducers: {
//     incrementRead: (state, action: PayloadAction<number>) => {
//       state.count += action.payload;
//     },
//     resetReads: (state) => {
//       state.count = 0;
//     },
//   },
// });

// export const { incrementRead, resetReads } = firestoreReadsSlice.actions;
// export default firestoreReadsSlice.reducer;

// firestoreReadsSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FirestoreReadState {
  count: number;
  maxCount: number;
  lastReadTimestamp: number | null; // Tracks when the last read occurred
}

const initialState: FirestoreReadState = {
  count: 0,
  maxCount: 100,
  lastReadTimestamp: null,
};

export const firestoreReadsSlice = createSlice({
  name: "firestoreReads",
  initialState,
  reducers: {
    incrementRead: (state, action: PayloadAction<number>) => {
      state.count += action.payload;
      state.lastReadTimestamp = Date.now(); // Update the timestamp on each read
    },
    resetReads: (state) => {
      state.count = 0;
      state.lastReadTimestamp = null; // Reset the timestamp when reads are reset
    },
    // Additional reducer to handle explicit logging of reads (could be expanded for more detailed logging)
    logRead: (state) => {
      console.log(`Firestore read at ${new Date(state.lastReadTimestamp ?? Date.now()).toISOString()}`);
    },
  },
});

export const { incrementRead, resetReads, logRead } = firestoreReadsSlice.actions;
export default firestoreReadsSlice.reducer;
