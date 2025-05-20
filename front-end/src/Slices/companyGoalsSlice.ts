import { createSelector, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { CompanyGoalWithIdType } from "../utils/types";

interface CompanyGoalsState {
  goals: CompanyGoalWithIdType[];
}

const initialState: CompanyGoalsState = {
  goals: [],
};

const companyGoalsSlice = createSlice({
  name: "companyGoals",
  initialState,
  reducers: {
    setCompanyGoals(state, action) {
      state.goals = action.payload;
    },
  },
});

export const { setCompanyGoals } = companyGoalsSlice.actions;
export default companyGoalsSlice.reducer;

//
// Selectors
//
export const selectAllCompanyGoals = (state: RootState): CompanyGoalWithIdType[] =>
  state.companyGoals.goals;

export const selectUsersCompanyGoals = createSelector(
  [
    selectAllCompanyGoals,
    (state: RootState) => state.user.currentUser?.uid,
    (_: RootState, salesRouteNum?: string) => salesRouteNum,
  ],
  (allGoals, userId, salesRouteNum) => {
    if (!userId) return [];
    return allGoals.filter((goal) =>
      goal.accountNumbersForThisGoal.some((accountNum) => accountNum === salesRouteNum)
    );
  }
);

