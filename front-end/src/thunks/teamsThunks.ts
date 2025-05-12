// teamsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../utils/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { CompanyTeamType } from "../utils/types";

export const fetchTeams = createAsyncThunk("teams/fetchTeams", async () => {
  const snapshot = await getDocs(collection(db, "teams"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as CompanyTeamType),
  }));
});

export const addTeam = createAsyncThunk(
  "teams/addTeam",
  async (newTeam: CompanyTeamType) => {
    const docRef = await addDoc(collection(db, "teams"), newTeam);
    return { id: docRef.id, ...newTeam };
  },
);

export const updateTeam = createAsyncThunk(
  "teams/updateTeam",
  async (
    { id, updateData }: { id: string; updateData: Partial<CompanyTeamType> },
    { getState, rejectWithValue },
  ) => {
    try {
      const docRef = doc(db, "teams", id);
      await updateDoc(docRef, updateData);

      // Optionally fetch the updated document to ensure all data is correct
      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error("Team not found");
      }

      return { id, ...(updatedDoc.data() as CompanyTeamType) };
    } catch (error) {
      return rejectWithValue("Failed to update team");
    }
  },
);

export const deleteTeam = createAsyncThunk(
  "teams/deleteTeam",
  async (id: string) => {
    await deleteDoc(doc(db, "teams", id));
    return id;
  },
);
