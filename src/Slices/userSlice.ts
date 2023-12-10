import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserType } from '../utils/types';

interface UserState {
  currentUser: UserType | null;
  otherUsers: Record<string, UserType>;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;  // Updated to string for simplification, adjust as needed
}

const initialState: UserState = {
  currentUser: null,
  otherUsers: {},
  loading: 'idle',
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // Action to set the current user
    setUser: (state, action: PayloadAction<UserType | null>) => {
      state.currentUser = action.payload;
      state.loading = 'idle';  // Optionally set loading state to 'idle'
      state.error = null;      // Optionally clear any previous error
    },
    // You can add other reducers here as needed
  },
  // No extraReducers needed unless you are handling other async thunks
  extraReducers: (builder) => {
    // Use the builder callback notation here
    // Example:
    builder.addCase(someAsyncThunk.fulfilled, (state, action) => {
      // handle the fulfilled case
    });
  },
});

// Export the action creators and selectors
export const { setUser } = userSlice.actions;
export const selectUser = (state: { user: UserState }) => state.user.currentUser;

// Export the reducer
export default userSlice.reducer;