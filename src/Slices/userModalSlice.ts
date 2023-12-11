// userModalSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserType } from '../utils/types';
import { RootState } from '../utils/store';
import { PostType } from '../utils/types';

interface UserModalState {
  isUserModalOpen: boolean;
  userData: UserType | null;
}

const initialState: UserModalState = {
  isUserModalOpen: false,
  userData: null,
};

const userModalSlice = createSlice({
  name: 'userModal',
  initialState,
  reducers: {
    openUserModal: (state, action: PayloadAction<PostType['user']>) => {
      state.isUserModalOpen = true;
      state.userData = action.payload; // payload contains user data
    },
    closeUserModal: (state) => {
      state.isUserModalOpen = false;
      state.userData = null;
    },
  },
});

export const { openUserModal, closeUserModal } = userModalSlice.actions;

export const selectIsUserModalOpen = (state: RootState) => state.userModal.isUserModalOpen;
export const selectUserData = (state: RootState) => state.userModal.userData;

export default userModalSlice.reducer;

