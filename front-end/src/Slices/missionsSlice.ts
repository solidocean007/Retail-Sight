import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CompanyMissionType } from '../utils/types';
import { fetchCompanyMissions } from '../thunks/missionsThunks';

interface CompanyMissionsState {
  [id: string]: CompanyMissionType;
}

const initialState: CompanyMissionsState = {};

const missionsSlice = createSlice({
  name: 'companyMissions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(fetchCompanyMissions.fulfilled, (state, action: PayloadAction<CompanyMissionType[]>) => {
      action.payload.forEach(companyMission => {
        state[companyMission.id!] = companyMission;
      });
    });
  },
});

export default missionsSlice.reducer;


