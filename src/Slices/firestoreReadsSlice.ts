import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FirestoreReadDetail {
  source: string; // The component or function that initiated the read
  description: string; // A brief description of the data being read
}

interface FirestoreReadState {
  count: number;
  maxCount: number;
  lastReadTimestamp: number | null;
  lastReadDetail: FirestoreReadDetail | null;
}

const initialState: FirestoreReadState = {
  count: 0,
  maxCount: 100,
  lastReadTimestamp: null,
  lastReadDetail: null,
};

export const firestoreReadsSlice = createSlice({
  name: "firestoreReads",
  initialState,
  reducers: {
    incrementRead: (state, action: PayloadAction<FirestoreReadDetail>) => {
      state.count += 1;
      state.lastReadTimestamp = Date.now();
      state.lastReadDetail = action.payload;
    },
    resetReads: (state) => {
      state.count = 0;
      state.lastReadTimestamp = null;
      state.lastReadDetail = null;
    },
    logRead: (state) => {
      if (state.lastReadDetail) {
        console.log(`Firestore read at ${new Date(state.lastReadTimestamp ?? Date.now()).toISOString()}, Source: ${state.lastReadDetail.source}, Description: ${state.lastReadDetail.description}`);
      }
    },
  },
});

export const { incrementRead, resetReads, logRead } = firestoreReadsSlice.actions;
export default firestoreReadsSlice.reducer;

