// userModalSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../utils/store';
import { PostType } from '../utils/types';

interface UserModalState {
  isUserModalOpen: boolean;
  userData: PostType['user'] | null;
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
      state.userData = action.payload; // Type '{ postUserName: string | undefined; postUserId: string | undefined; postUserCompany: string | undefined; postUserEmail: string | undefined; }' is missing the following properties from type 'WritableDraft<UserType>': uid, firstName, lastName, email, and 2 more.ts(2740)
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

