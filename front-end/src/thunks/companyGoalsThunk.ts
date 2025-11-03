// companyGoalsThunk.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { CompanyGoalType, GoalAssignmentType, UserType } from "../utils/types";

// ✅ Create new goal
export const createCompanyGoalInFirestore = createAsyncThunk(
  "companyGoals/create",
  async (
    { goal, currentUser }: { goal: CompanyGoalType; currentUser: UserType },
    thunkAPI
  ) => {
    if (!goal.companyId) {
      console.error("Missing companyId in goal creation");
      return thunkAPI.rejectWithValue("Missing companyId");
    }

    try {
      const goalRef = await addDoc(collection(db, "companyGoals"), {
        ...goal,
        createdAt: serverTimestamp(),
        createdByUserId: currentUser.uid,
        createdByFirstName: currentUser.firstName,
        createdByLastName: currentUser.lastName,
      });
      console.log("✅ Goal created with ID:", goalRef.id);
      return { id: goalRef.id, ...goal };
    } catch (err: any) {
      console.error("❌ Error creating goal:", err);
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// ✅ Update existing goal (supports new goalAssignments)
export const updateCompanyGoalInFirestore = createAsyncThunk(
  "companyGoals/updateGoal",
  async ({
    goalId,
    updatedFields,
  }: {
    goalId: string;
    updatedFields: Partial<CompanyGoalType>;
  }) => {
    const goalRef = doc(db, "companyGoals", goalId);
    const cleanedFields: Record<string, any> = { ...updatedFields };

    // --- Handle field cleanup ---
    if (cleanedFields.perUserQuota === 0) {
      cleanedFields.perUserQuota = deleteField();
    }

    // --- Ensure assignments are saved atomically ---
    if (Array.isArray(cleanedFields.goalAssignments)) {
      cleanedFields.goalAssignments = cleanedFields.goalAssignments.map(
        (a: GoalAssignmentType) => ({
          uid: a.uid,
          accountNumber: a.accountNumber.toString(),
        })
      );

      // 🔹 Maintain backward compatibility
      const accountNumbers = Array.from(
        new Set(
          cleanedFields.goalAssignments.map(
            (a: GoalAssignmentType) => a.accountNumber
          )
        )
      );
      cleanedFields.accountNumbersForThisGoal = accountNumbers;
    }

    try {
      // Optional: merge with existing goal to preserve unedited fields
      const snap = await getDoc(goalRef);
      if (!snap.exists()) {
        console.warn("⚠️ Goal not found during update:", goalId);
        return { goalId, updatedFields };
      }

      const existing = snap.data();
      const merged = { ...existing, ...cleanedFields };

      await updateDoc(goalRef, merged);
      console.log("✅ Goal updated:", goalId);
      return { goalId, updatedFields: merged };
    } catch (err: any) {
      console.error("❌ Error updating goal:", err);
      throw err;
    }
  }
);

// ✅ Delete (soft-delete)
export const deleteCompanyGoalInFirestore = createAsyncThunk<
  void,
  { goalId: string },
  { rejectValue: string }
>("companyGoals/deleteCompanyGoal", async ({ goalId }, { rejectWithValue }) => {
  try {
    const goalRef = doc(db, "companyGoals", goalId);
    await updateDoc(goalRef, { deleted: true });
  } catch (err) {
    return rejectWithValue("Failed to delete company goal.");
  }
});
