// userModalSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../utils/store';

interface UserModalState {
  isUserModalOpen: boolean;
  userName: string | null;
  userEmail: string | null;
}

const initialState: UserModalState = {
  isUserModalOpen: false,
  userName: null,
  userEmail: null,
};

const userModalSlice = createSlice({
  name: 'userModal',
  initialState,
  reducers: {
    openUserModal: (state, action: PayloadAction<{ userName: string; userEmail: string }>) => {
      state.isUserModalOpen = true;
      state.userName = action.payload.userName;
      state.userEmail = action.payload.userEmail; // Type '{ postUserName: string | undefined; postUserId: string | undefined; postUserCompany: string | undefined; postUserEmail: string | undefined; }' is missing the following properties from type 'WritableDraft<UserType>': uid, firstName, lastName, email, and 2 more.ts(2740)
    },
    closeUserModal: (state) => {
      state.isUserModalOpen = false;
      state.userName = null;
      state.userEmail = null;
    },
    clearUserModal: ((state)=> {
      state.userEmail = null;
      state.userName = null;
    } )
  },
});

export const { openUserModal, closeUserModal, clearUserModal } = userModalSlice.actions;

export const selectIsUserModalOpen = (state: RootState) => state.userModal.isUserModalOpen;
export const selectUserName = (state: RootState) => state.userModal.userName;
export const selectUserEmail = (state: RootState) => state.userModal.userEmail;

export default userModalSlice.reducer;

