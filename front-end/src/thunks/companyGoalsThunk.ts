import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import { CompanyGoalType } from "../utils/types";

export const createCompanyGoalInFirestore = createAsyncThunk<
  void,
  { goal: CompanyGoalType },
  { rejectValue: string }
>("companyGoals/createCompanyGoal", async ({ goal }, { rejectWithValue }) => {
  try {
    const goalsCollection = collection(db, "companyGoals");
    await addDoc(goalsCollection, goal);
  } catch (err) {
    return rejectWithValue("Failed to create company goal.");
  }
});

// ✅ Update Goal
export const updateCompanyGoalInFirestore = createAsyncThunk<
  void,
  { goalId: string; updatedFields: Partial<CompanyGoalType> },
  { rejectValue: string }
>(
  "companyGoals/updateCompanyGoal",
  async ({ goalId, updatedFields }, { rejectWithValue }) => {
    try {
      const goalRef = doc(db, "companyGoals", goalId);
      await updateDoc(goalRef, updatedFields);
    } catch (err) {
      return rejectWithValue("Failed to update company goal.");
    }
  }
);

// ✅ Delete Goal
export const deleteCompanyGoalInFirestore = createAsyncThunk<
  void,
  { goalId: string },
  { rejectValue: string }
>(
  "companyGoals/deleteCompanyGoal",
  async ({ goalId }, { rejectWithValue }) => {
    try {
      const goalRef = doc(db, "companyGoals", goalId);
      await deleteDoc(goalRef);
    } catch (err) {
      return rejectWithValue("Failed to delete company goal.");
    }
  }
);
