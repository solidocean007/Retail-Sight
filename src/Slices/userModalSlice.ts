// userModalSlice.ts
import { createSlice } from '@reduxjs/toolkit';

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

export const selectIsUserModalOpen = (state: any) => state.userModal.isUserModalOpen;
export const selectSelectedUid = (state: any) => state.userModal.selectedUid;

