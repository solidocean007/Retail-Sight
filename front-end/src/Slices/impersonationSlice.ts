// impersonationSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ImpersonationState {
  active: boolean;
  companyId: string | null;
}

const initialState: ImpersonationState = {
  active: false,
  companyId: null,
};

const impersonationSlice = createSlice({
  name: "impersonation",
  initialState,
  reducers: {
    startImpersonation: (state, action: PayloadAction<string>) => {
      state.active = true;
      state.companyId = action.payload;
    },
    stopImpersonation: (state) => {
      state.active = false;
      state.companyId = null;
    },
  },
});

// selectors/selectEffectiveCompanyId.ts
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { useSelector } from "react-redux";
import { AppThunk, clearCompanyScopedState } from "../utils/store";

export const startViewAsCompany =
  (companyId: string): AppThunk =>
  (dispatch) => {
    dispatch(clearCompanyScopedState());
    dispatch(startImpersonation(companyId));
  };

export const stopViewAsCompany = (): AppThunk => (dispatch) => {
  dispatch(clearCompanyScopedState());
  dispatch(stopImpersonation());
};

export const selectIsImpersonating = (state: RootState) =>
  state.impersonation.active;

export const selectEffectiveCompanyId = createSelector(
  (state: RootState) => state.impersonation,
  (state: RootState) => state.user.currentUser,
  (impersonation, currentUser) =>
    impersonation.active && impersonation.companyId
      ? impersonation.companyId
      : (currentUser?.companyId ?? null),
);

export const useIsImpersonating = () => useSelector(selectIsImpersonating);

export const { startImpersonation, stopImpersonation } =
  impersonationSlice.actions;

export default impersonationSlice.reducer;
