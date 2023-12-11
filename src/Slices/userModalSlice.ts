// userModalSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../utils/store';

interface UserModalState {
  isUserModalOpen: boolean;
  selectedUid: string | null;
}

const initialState: UserModalState = {
  isUserModalOpen: false,
  selectedUid: null,
};

const userModalSlice = createSlice({
  name: 'userModal',
  initialState,
  reducers: {
    openUserModal: (state, action) => {
      state.isUserModalOpen = true;
      state.selectedUid = action.payload;
    },
    closeUserModal: (state) => {
      state.isUserModalOpen = false;
      state.selectedUid = null;
    },
  },
});

export const { openUserModal, closeUserModal } = userModalSlice.actions;

export default userModalSlice.reducer;

export const selectIsUserModalOpen = (state: RootState) => state.userModal.isUserModalOpen;
export const selectSelectedUid = (state: RootState) => state.userModal.selectedUid;