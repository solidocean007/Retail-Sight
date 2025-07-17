import { createAsyncThunk } from "@reduxjs/toolkit";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { FireStoreGalloGoalDocType } from "../utils/types";
import { saveSingleGalloGoalToIndexedDB } from "../utils/database/goalsStoreUtils";

/**
 * markGalloAccountAsSubmitted
 * Updates a specific account in a Gallo goal with the submittedPostId
 */
export const markGalloAccountAsSubmitted = createAsyncThunk<
  FireStoreGalloGoalDocType,
  { goal: FireStoreGalloGoalDocType; accountNumber: string; postId: string },
  { state: any }
>(
  "galloGoals/markGalloAccountAsSubmitted",
  async ({ goal, accountNumber, postId }, { getState, rejectWithValue }) => {
    try {
      // ✅ Directly find the target account and update it
      const updatedAccounts = goal.accounts.map((account) => {
        if (account.distributorAcctId === accountNumber) {
          return { ...account, submittedPostId: postId };
        }
        return account; // Preserve others
      });

      const updatedGoal: FireStoreGalloGoalDocType = {
        ...goal,
        accounts: updatedAccounts, // ✅ Always use full array
      };

      // 🔥 Write back to Firestore
      const goalRef = doc(db, "galloGoals", goal.goalDetails.goalId);
      await updateDoc(goalRef, { accounts: updatedAccounts });

      // ✅ Save locally
      await saveSingleGalloGoalToIndexedDB(updatedGoal);

      return updatedGoal;
    } catch (error: any) {
      console.error("❌ Failed to update Gallo Goal:", error);
      return rejectWithValue(error.message || "Failed to update Gallo Goal");
    }
  }
);

