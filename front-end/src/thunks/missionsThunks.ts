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
  // updateDoc
} from "firebase/firestore";
import {
  CompanyMissionType,
  MissionType,
  SubmittedMissionType,
} from "../utils/types";

export const fetchCompanyMissions = createAsyncThunk<
  CompanyMissionType[], // Return type
  string // Argument type
>("companyMissions/fetchCompanyMissions", async (companyId: string) => {
  const q = query(
    collection(db, "companyMissions"),
    where("companyIdAssigned", "==", companyId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as CompanyMissionType),
  }));
});

export const fetchMissions = createAsyncThunk(
  "missions/fetchMissions",
  async (missionId: string) => {
    // Reference the document directly by its ID
    const missionRef = doc(db, "missions", missionId);
    const snapshot = await getDoc(missionRef);

    if (snapshot.exists()) {
      return { id: snapshot.id, ...(snapshot.data() as MissionType) };
    } else {
      throw new Error("Mission not found");
    }
  },
);

export const createSubmittedMission = createAsyncThunk(
  "submittedMissions/createSubmittedMission",
  async (submittedMission: SubmittedMissionType) => {
    const submittedMissionRef = await addDoc(
      collection(db, "submittedMissions"),
      submittedMission,
    );
    return { id: submittedMissionRef.id, ...submittedMission };
  },
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
