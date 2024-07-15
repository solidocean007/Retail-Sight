// missionsSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { fetchCompanyMissions, fetchMissionById, submitSelectedMissions } from '../thunks/missionsThunks';
import { CompanyMissionType, MissionsType, SubmittedMissionType } from '../utils/types';


interface MissionsState {
  companyMissions: { [id: string]: CompanyMissionType };
  missions: { [id: string]: MissionsType };
  submittedMissions: { [id: string]: SubmittedMissionType };
}

const initialState: MissionsState = {
  companyMissions: {},
  missions: {},
  submittedMissions: {},
};

const missionsSlice = createSlice({
  name: 'missions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCompanyMissions.fulfilled, (state, action: PayloadAction<CompanyMissionType[]>) => {
      action.payload.forEach(companyMission => {
        state.companyMissions[companyMission.id!] = companyMission;
      });
    });
    builder.addCase(fetchMissionById.fulfilled, (state, action: PayloadAction<MissionsType>) => {
      state.missions[action.payload.id!] = action.payload;
    });
    builder.addCase(submitSelectedMissions.fulfilled, (state, action: PayloadAction<SubmittedMissionType>) => {
      state.submittedMissions[action.payload.id!] = action.payload;
    });
  },
});

export default missionsSlice.reducer;