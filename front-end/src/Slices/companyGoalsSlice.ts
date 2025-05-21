import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { CompanyAccountType, CompanyGoalWithIdType } from "../utils/types";
import { selectAllCompanyAccounts } from "./allAccountsSlice";

interface CompanyGoalsState {
  goals: CompanyGoalWithIdType[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: CompanyGoalsState = {
  goals: [],
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const companyGoalsSlice = createSlice({
  name: "companyGoals",
  initialState,
  reducers: {
    setCompanyGoals(state, action: PayloadAction<CompanyGoalWithIdType[]>) {
      state.goals = action.payload;
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
    setCompanyGoalsLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setCompanyGoalsError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const {
  setCompanyGoals,
  setCompanyGoalsLoading,
  setCompanyGoalsError,
} = companyGoalsSlice.actions;

export default companyGoalsSlice.reducer;

//
// Selectors
//
export const selectAllCompanyGoals = (state: RootState) =>
  state.companyGoals.goals;

export const selectCompanyGoalsIsLoading = (state: RootState) =>
  state.companyGoals.isLoading;

export const selectCompanyGoalsError = (state: RootState) =>
  state.companyGoals.error;

export const selectCompanyGoalsLastUpdated = (state: RootState) =>
  state.companyGoals.lastUpdated;

export const selectUsersCompanyGoals = createSelector(
  [
    selectAllCompanyGoals,
    (state: RootState) => state.user.currentUser?.salesRouteNum,
    (state: RootState) => state.allAccounts.accounts || [],
  ],
  (allGoals, userSalesRouteNum, allAccounts) => {
    if (!userSalesRouteNum) return [];

    // Get all accountNumbers tied to the user's salesRouteNum
    const matchingAccountNumbers = allAccounts
      .filter((acc) => acc.salesRouteNums?.includes(userSalesRouteNum))
      .map((acc) => acc.accountNumber.toString());

    return allGoals.filter((goal) =>
      goal.accountNumbersForThisGoal.some((accNum) =>
        matchingAccountNumbers.includes(accNum)
      )
    );
  }
);

export const makeSelectUsersCompanyGoals = (salesRouteNum?: string) =>
  createSelector(
    [selectAllCompanyGoals, selectAllCompanyAccounts],
    (allGoals, allAccounts) => {
      if (!salesRouteNum) return [];

      return allGoals.filter((goal: CompanyGoalWithIdType) => {
        const matchingAccounts = goal.accountNumbersForThisGoal
          .map(accountId =>
            allAccounts.find(acc => acc.accountNumber.toString() === accountId)
          )
          .filter(Boolean) as CompanyAccountType[];

        return matchingAccounts.some(account =>
          (account.salesRouteNums || []).includes(salesRouteNum)
        );
      });
    }
  );



