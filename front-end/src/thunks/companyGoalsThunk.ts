import { createAsyncThunk } from "@reduxjs/toolkit";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../utils/firebase";
import { CompanyGoalType } from "../utils/types";

export const updateCompanyGoalInFirestore = createAsyncThunk<
  void,
  { companyId: string; goalId: string; updatedFields: Partial<CompanyGoalType> },
  { rejectValue: string }
>(
  "companyGoals/updateCompanyGoal",
  async ({ companyId, goalId, updatedFields }, { rejectWithValue }) => {
    try {
      const goalRef = doc(db, "companies", companyId, "goals", goalId);
      await updateDoc(goalRef, updatedFields);
    } catch (err) {
      return rejectWithValue("Failed to update company goal.");
    }
  }
);

export const createCompanyGoalInFirestore = createAsyncThunk<
  void,
  { companyId: string; goal: CompanyGoalType },
  { rejectValue: string }
>(
  "companyGoals/createCompanyGoal",
  async ({ companyId, goal }, { rejectWithValue }) => {
    try {
      const goalsCollection = collection(db, "companies", companyId, "goals");
      await addDoc(goalsCollection, goal);
    } catch (err) {
      return rejectWithValue("Failed to create company goal.");
    }
  }
);

export const deleteCompanyGoalInFirestore = createAsyncThunk<
  void,
  { companyId: string; goalId: string },
  { rejectValue: string }
>(
  "companyGoals/deleteCompanyGoal",
  async ({ companyId, goalId }, { rejectWithValue }) => {
    try {
      const goalRef = doc(db, "companies", companyId, "goals", goalId);
      await deleteDoc(goalRef);
    } catch (err) {
      return rejectWithValue("Failed to delete company goal.");
    }
  }
);