// missionsThunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { db } from "../utils/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { CompanyMissionType, MissionType, SubmittedMissionType } from "../utils/types";

export const fetchCompanyMissions = createAsyncThunk(
  'companyMissions/fetchCompanyMissions',
  async (companyId: string) => {
    const q = query(collection(db, 'companyMissions'), where('companyIdAssigned', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as CompanyMissionType }));
  }
);

export const fetchMissionById = createAsyncThunk(
  'missions/fetchMissionById',
  async (missionId: string) => {
    const docRef = doc(db, 'missions', missionId); // Correct way to get a document reference
    const docSnap = await getDoc(docRef); // Fetch the document snapshot

    if (!docSnap.exists()) {
      throw new Error(`Mission with ID ${missionId} not found`);
    }

    return { id: docSnap.id, ...docSnap.data() as MissionType };
  }
);

export const submitSelectedMissions = createAsyncThunk(
  'submittedMissions/submitSelectedMissions',
  async(submittedMission: SubmittedMissionType) => {
    const docRef = await addDoc(collection(db, 'submittedMissions'), submittedMission);
    return { id: docRef.id, ...submittedMission};
  }
);

// export const addMission = createAsyncThunk('missions/addMissions', async (newMission: MissionsType) => {
//   const docRef = await addDoc(collection(db, 'missions'), newMission);
//   return { id: docRef.id, ...newMission };
// });

// export const updateTeam = createAsyncThunk('teams/updateTeam', async ({ id, updateData }: { id: string, updateData: Partial<CompanyTeamType> }, { getState, rejectWithValue }) => {
//   try {
//     const docRef = doc(db, 'teams', id);
//     await updateDoc(docRef, updateData);

//     // Optionally fetch the updated document to ensure all data is correct
//     const updatedDoc = await getDoc(docRef);
//     if (!updatedDoc.exists()) {
//       throw new Error('Team not found');
//     }

//     return { id, ...(updatedDoc.data() as CompanyTeamType) };
//   } catch (error) {
//     return rejectWithValue('Failed to update team');
//   }
// });


// export const deleteTeam = createAsyncThunk('teams/deleteTeam', async (id: string) => {
//   await deleteDoc(doc(db, 'teams', id));
//   return id;
// });
