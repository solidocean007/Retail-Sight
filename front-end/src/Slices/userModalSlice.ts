// userModalSlice.ts
import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";

interface UserModalPayload {
  fullName: string;
  userEmail: string;
  postId: string;
  storeName: string;
  displayDate: string;
}

interface UserModalState extends Partial<UserModalPayload> {
  isUserModalOpen: boolean;
}

const initialState: UserModalState = {
  isUserModalOpen: false,
  fullName: "",
  userEmail: "",
  postId: "",
  storeName: "",
  displayDate: "",
};

const userModalSlice = createSlice({
  name: "userModal",
  initialState,
  reducers: {
    openUserModal: (state, action: PayloadAction<UserModalPayload>) => {
      return {
        ...state,
        isUserModalOpen: true,
        ...action.payload,
      };
    },
    closeUserModal: (state) => {
      state.isUserModalOpen = false;
    },
    clearUserModal: () => {
      return { ...initialState };
    },
  },
});

export const { openUserModal, closeUserModal, clearUserModal } =
  userModalSlice.actions;

export const selectIsUserModalOpen = (state: RootState) =>
  state.userModal.isUserModalOpen;

export const selectUserModalData = createSelector(
  (state: RootState) => state.userModal,
  (userModal) => ({
    fullName: userModal.fullName,
    userEmail: userModal.userEmail,
    postId: userModal.postId,
    storeName: userModal.storeName,
    displayDate: userModal.displayDate,
  })
);

export default userModalSlice.reducer;
