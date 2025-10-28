// companyGoalsSlice.ts
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

/**
 * 🔹 Returns goals visible to the current user (sales or supervisor).
 * Prioritizes new goalAssignments model, falls back to accountNumbersForThisGoal.
 */
export const selectUsersCompanyGoals = createSelector(
  [
    selectAllCompanyGoals,
    (state: RootState) => state.user.currentUser,
    selectAllCompanyAccounts,
    (state: RootState) => state.user.companyUsers || [],
  ],
  (allGoals, currentUser, allAccounts, companyUsers) => {
    if (!currentUser) return [];
    const { uid, salesRouteNum, role } = currentUser;

    return allGoals.filter((goal) => {
      // --- 🆕 New model: explicit goalAssignments
      if (goal.goalAssignments?.length) {
        // ✅ Sales: any assignment directly for this user
        if (
          goal.targetRole === "sales" &&
          goal.goalAssignments.some((a) => a.uid === uid)
        ) {
          return true;
        }

        // ✅ Supervisor: has at least one rep whose assignment is included
        if (goal.targetRole === "supervisor" && role === "supervisor") {
          const repsReportingToMe = companyUsers.filter(
            (r) => r.reportsTo === uid
          );
          const repIds = new Set(repsReportingToMe.map((r) => r.uid));
          return goal.goalAssignments.some((a) => repIds.has(a.uid));
        }

        // Admins see all
        if (role === "admin" || role === "super-admin") return true;

        return false;
      }

      // --- 🕰️ Legacy fallback (route-based)
      if (goal.targetRole === "sales" && salesRouteNum) {
        const matchingAccountNumbers = allAccounts
          .filter((acc) => acc.salesRouteNums?.includes(salesRouteNum))
          .map((acc) => acc.accountNumber.toString());
        return goal.accountNumbersForThisGoal?.some((accNum) =>
          matchingAccountNumbers.includes(accNum)
        );
      }

      if (goal.targetRole === "supervisor" && role === "supervisor") {
        const repsReportingToMe = companyUsers.filter(
          (u) => u.reportsTo === uid && u.salesRouteNum
        );
        const myRepsRouteNums = repsReportingToMe.map((r) => r.salesRouteNum);

        const matchingAccounts = (goal.accountNumbersForThisGoal || [])
          .map((accountId) =>
            allAccounts.find(
              (acc) => acc.accountNumber.toString() === accountId
            )
          )
          .filter(Boolean) as CompanyAccountType[];

        return matchingAccounts.some((acc) =>
          acc.salesRouteNums?.some((rn) => myRepsRouteNums.includes(rn))
        );
      }

      return false;
    });
  }
);

/**
 * 🔹 Factory: Select goals visible to a given user by ID + role.
 * Used in user-specific dashboards or supervisor analytics.
 */
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
          ? selectAllCompanyAccounts(state)
          : selectUserAccounts(state),
      (state: RootState) => state.user.companyUsers || [],
    ],
    (allGoals, relevantAccounts, companyUsers) => {
      if (!salesRouteNum && !userId) return [];

      return allGoals.filter((goal: CompanyGoalWithIdType) => {
        // --- 🆕 goalAssignments model
        if (goal.goalAssignments?.length) {
          if (goal.targetRole === "sales" && userId) {
            return goal.goalAssignments.some((a) => a.uid === userId);
          }

          if (goal.targetRole === "supervisor" && userId) {
            const repsReportingToMe = companyUsers.filter(
              (u) => u.reportsTo === userId
            );
            const repIds = new Set(repsReportingToMe.map((r) => r.uid));
            return goal.goalAssignments.some((a) => repIds.has(a.uid));
          }

          if (role === "admin" || role === "super-admin") return true;
        }

        // --- 🕰️ Legacy fallback
        if (goal.targetRole === "sales" && salesRouteNum) {
          const matchingAccounts = (goal.accountNumbersForThisGoal || [])
            .map((accountId) =>
              relevantAccounts.find(
                (acc) => acc.accountNumber.toString() === accountId
              )
            )
            .filter(Boolean) as CompanyAccountType[];

          return matchingAccounts.some((account) =>
            (account.salesRouteNums || []).includes(salesRouteNum)
          );
        }

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

          return matchingAccounts.some((acc) =>
            acc.salesRouteNums?.some((rn) => myRepsRouteNums.includes(rn))
          );
        }

        return false;
      });
    }
  );
