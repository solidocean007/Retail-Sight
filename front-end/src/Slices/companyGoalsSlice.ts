import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../utils/store";
import { CompanyAccountType, CompanyGoalWithIdType } from "../utils/types";
import { selectAllCompanyAccounts } from "./allAccountsSlice";
import { selectUserAccounts } from "./userAccountsSlice";

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

export const { setCompanyGoals, setCompanyGoalsLoading, setCompanyGoalsError } =
  companyGoalsSlice.actions;

export default companyGoalsSlice.reducer;

//
// Selectors
//
export const selectAllCompanyGoals = createSelector(
  (state: RootState) => state.companyGoals.goals,
  (goals) => goals.filter((goal) => !goal.deleted)
);
export const selectCompanyGoalsIsLoading = (state: RootState) =>
  state.companyGoals.isLoading;

export const selectCompanyGoalsError = (state: RootState) =>
  state.companyGoals.error;

export const selectCompanyGoalsLastUpdated = (state: RootState) =>
  state.companyGoals.lastUpdated;

export const selectUsersCompanyGoals = createSelector(
  [
    selectAllCompanyGoals,
    (state: RootState) => state.user.currentUser,
    (state: RootState) => state.allAccounts.accounts || [],
    (state: RootState) => state.user.companyUsers || [], // need supervisors + reps
  ],
  (allGoals, currentUser, allAccounts, companyUsers) => {
    if (!currentUser) return [];

    const { salesRouteNum, uid, role } = currentUser;

    return allGoals.filter((goal) => {
      // 🔹 Sales employee logic
      if (goal.targetRole === "sales" && salesRouteNum) {
        const matchingAccountNumbers = allAccounts
          .filter((acc) => acc.salesRouteNums?.includes(salesRouteNum))
          .map((acc) => acc.accountNumber.toString());

        return goal.accountNumbersForThisGoal?.some((accNum) =>
          matchingAccountNumbers.includes(accNum)
        );
      }

      // 🔹 Supervisor logic
      if (goal.targetRole === "supervisor" && role === "supervisor") {
        const repsReportingToMe = companyUsers.filter(
          (u) => u.reportsTo === uid && u.salesRouteNum
        );
        const myRepsRouteNums = repsReportingToMe.map((r) => r.salesRouteNum);

        // Get all accounts covered by this goal
        const matchingAccounts = (goal.accountNumbersForThisGoal || [])
          .map((accountId) =>
            allAccounts.find(
              (acc) => acc.accountNumber.toString() === accountId
            )
          )
          .filter(Boolean) as CompanyAccountType[];

        // Overlap check
        return matchingAccounts.some((acc) =>
          acc.salesRouteNums?.some((rn) => myRepsRouteNums.includes(rn))
        );
      }

      return false;
    });
  }
);

export const makeSelectUsersCompanyGoals = (
  salesRouteNum?: string,
  userId?: string,
  role?: string
) =>
  createSelector(
    [
      selectAllCompanyGoals,
      (state: RootState) =>
        role === "supervisor" || role === "admin" || role === "super-admin"
          ? selectAllCompanyAccounts(state) // supervisors+admins need all accounts
          : selectUserAccounts(state), // sales reps just need their slice
      (state: RootState) => state.user.companyUsers || [],
    ],
    (allGoals, relevantAccounts, companyUsers) => {
      if (!salesRouteNum && !userId) {
        console.log("⛔ No salesRouteNum or userId, returning []");
        return [];
      }

      return allGoals.filter((goal: CompanyGoalWithIdType) => {
        // 🔹 Sales
        if (goal.targetRole === "sales" && salesRouteNum) {
          const matchingAccounts = (goal.accountNumbersForThisGoal || [])
            .map((accountId) =>
              relevantAccounts.find(
                (acc) => acc.accountNumber.toString() === accountId
              )
            )
            .filter(Boolean) as CompanyAccountType[];

          const match = matchingAccounts.some((account) =>
            (account.salesRouteNums || []).includes(salesRouteNum)
          );

          return match;
        }

        // 🔹 Supervisor
        if (
          goal.targetRole === "supervisor" &&
          role === "supervisor" &&
          userId
        ) {
          const repsReportingToMe = companyUsers.filter(
            (u) => u.reportsTo === userId && u.salesRouteNum
          );
          const myRepsRouteNums = repsReportingToMe.map((r) => r.salesRouteNum);

          const matchingAccounts = (goal.accountNumbersForThisGoal || [])
            .map((accountId) =>
              relevantAccounts.find(
                (acc) => acc.accountNumber.toString() === accountId
              )
            )
            .filter(Boolean) as CompanyAccountType[];

          const match = matchingAccounts.some((acc) =>
            acc.salesRouteNums?.some((rn) => myRepsRouteNums.includes(rn))
          );

          return match;
        }

        return false;
      });
    }
  );
