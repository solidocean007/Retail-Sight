// userSlice.ts
import { createSlice, SerializedError } from '@reduxjs/toolkit';
import { UserType } from '../utils/types';
import { setUser } from '../actions/userActions';

interface UserState {
  currentUser: UserType | null;
  otherUsers: Record<string, UserType>;
  loading: 'idle' | 'pending' | 'succeeded' | 'failed';
  error: SerializedError | null;
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
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(setUser.pending, (state) => {
        state.loading = 'pending';
      })
      .addCase(setUser.fulfilled, (state, action) => {
        state.loading = 'succeeded';
        state.currentUser = action.payload;
      })
      .addMatcher((action): action is ReturnType<typeof setUser.rejected> => action.type === setUser.rejected.type, (state, action) => {
        state.loading = 'failed';
        state.error = action.error;
      });
  }
  
});
export const selectUser = (state: { user: UserState }) => state.user.currentUser;
export default userSlice.reducer;