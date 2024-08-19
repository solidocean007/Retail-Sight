// slices/teamsSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { TeamWithID, CompanyTeamType } from '../utils/types';
import { fetchTeams, addTeam, updateTeam, deleteTeam } from '../thunks/teamsThunks';

interface TeamsState {
  teams: TeamWithID[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TeamsState = {
  teams: [],
  status: 'idle',
  error: null
};

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    clearTeams: (state) => {
      state.teams = [];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.teams = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || null;
      })
      .addCase(addTeam.fulfilled, (state, action) => {
        state.teams.push(action.payload);
      })
      .addCase(updateTeam.fulfilled, (state, action) => {
        const index = state.teams.findIndex(team => team.id === action.payload.id);
        if (index !== -1) {
          state.teams[index] = action.payload; 
        }
      })
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.teams = state.teams.filter(team => team.id !== action.payload);
      });
  }
});

export const {clearTeams}= teamsSlice.actions;
export default teamsSlice.reducer;

