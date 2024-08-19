import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CompanyMissionType, MissionType } from '../utils/types';
import { fetchCompanyMissions, fetchMissions } from '../thunks/missionsThunks';

interface MissionState {
  details: MissionType | null;
  companyMission: CompanyMissionType;
}

interface MissionsState {
  [id: string]: MissionState;
}

const initialState: MissionsState = {};

const missionsSlice = createSlice({
  name: 'missions',
  initialState,
  reducers: {
    clearMissions: (_state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanyMissions.fulfilled, (state, action: PayloadAction<CompanyMissionType[]>) => {
        action.payload.forEach(companyMission => {
          if (!state[companyMission.id!]) {
            state[companyMission.id!] = {
              details: null,
              companyMission,
            };
          } else {
            state[companyMission.id!].companyMission = companyMission;
          }
        });
      })
      .addCase(fetchMissions.fulfilled, (state, action: PayloadAction<MissionType>) => {
        const missionId = action.payload.id!;
        if (state[missionId]) {
          state[missionId].details = action.payload;
        } else {
          state[missionId] = {
            details: action.payload,
            companyMission: {} as CompanyMissionType, // Initialize an empty object if no company mission is fetched yet
          };
        }
      });
  },
});
export const {clearMissions} = missionsSlice.actions;
export default missionsSlice.reducer;



