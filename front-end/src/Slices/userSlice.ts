import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserType } from '../utils/types';
import { fetchCompanyUsers } from '../thunks/usersThunks';
import { RootState } from '../utils/store';

interface UserState {
  currentUser: UserType | null;
  otherUsers: Record<string, UserType>;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: string | null;  // Updated to string for simplification, adjust as needed
  companyUsers: UserType[];
}

const initialState: UserState = {
  currentUser: null,
  otherUsers: {},
  loading: 'idle',
  error: null,
  companyUsers: [],
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
    // Add new reducer for setting company users
    setCompanyUsers: (state, action: PayloadAction<UserType[]>) => {
      state.companyUsers = action.payload;
    },
    // Reducers for handling loading and error states
    setLoading: (state, action: PayloadAction<'idle' | 'pending' | 'succeeded' | 'failed'>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  // No extraReducers needed unless you are handling other async thunks
  // extraReducers: (builder) => {
  extraReducers: (builder) => {
    builder
    .addCase(fetchCompanyUsers.pending, (state) => {
      state.loading = 'pending';
    })
    .addCase(fetchCompanyUsers.fulfilled, (state, action) => {
      state.companyUsers = action.payload;
      state.loading = 'succeeded';
    })
    .addCase(fetchCompanyUsers.rejected, (state, action) => {
      state.error = action.payload as string;
      state.loading = 'failed';
    });
  },
});

// Export the action creators and selectors
export const { setUser, setCompanyUsers, setLoading, setError } = userSlice.actions;
export const selectUser = (state: { user: UserState }) => state.user.currentUser;
export const selectCompanyUsers = (state: RootState) => state.user.companyUsers;


// Export the reducer
export default userSlice.reducer;