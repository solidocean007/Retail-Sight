import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { CompanyGoalType, UserType } from "../utils/types";

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
      console.log("Goal created with ID:", goalRef.id);
      return { id: goalRef.id, ...goal };
    } catch (err: any) {
      console.error("Error creating goal:", err);
      return thunkAPI.rejectWithValue(err.message);
    }
  }
);

// ✅ Update Goal
export const updateCompanyGoalInFirestore = createAsyncThunk(
  "companyGoals/updateGoal",
  async ({
    goalId,
    updatedFields,
  }: {
    goalId: string;
    updatedFields: Partial<CompanyGoalType>;
  }) => {
    const docRef = doc(db, "companyGoals", goalId);

    // 🔧 Cast to allow FieldValue inside updateDoc only
    const cleanedFields: Record<string, any> = { ...updatedFields };

    if (cleanedFields.perUserQuota === 0) {
      cleanedFields.perUserQuota = deleteField(); // ✅ now allowed
    }

    await updateDoc(docRef, cleanedFields);
    return { goalId, updatedFields };
  }
);

// ✅ Delete Goal
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
