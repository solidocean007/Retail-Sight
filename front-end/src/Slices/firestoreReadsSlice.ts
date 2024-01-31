import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FirestoreReadDetail {
  source: string; // The component or function that initiated the read
  description: string; // A brief description of the data being read
  timestamp: string;
}

interface FirestoreReadState {
  count: number;
  maxCount: number;
  readDetails: FirestoreReadDetail[]; // Store an array of read details
}

const initialState: FirestoreReadState = {
  count: 0,
  maxCount: 100,
  readDetails: [], // Initialize as an empty array
};


export const firestoreReadsSlice = createSlice({
  name: "firestoreReads",
  initialState,
  reducers: {
    incrementRead: (state, action: PayloadAction<FirestoreReadDetail>) => {
      state.count += 1;
      state.readDetails.push({ ...action.payload, timestamp: new Date().toISOString() }); // Add new read detail to array
    },
    resetReads: (state) => {
      state.count = 0;
      state.readDetails = []; // Reset to an empty array
    },
    // Optionally, you could keep the logRead reducer to log the latest read or all reads
    logRead: (state) => {
      state.readDetails.forEach((detail) => {
        console.log(`Firestore read at ${new Date(detail.timestamp).toISOString()}, Source: ${detail.source}, Description: ${detail.description}`);
      });
    },
  },
});

export const { incrementRead, resetReads, logRead } = firestoreReadsSlice.actions;
export default firestoreReadsSlice.reducer;

