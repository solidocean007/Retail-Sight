import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CompanyType, CompanyGoalWithIdType } from "../utils/types";
import { RootState } from "../utils/store";

interface CompanyState {
  company: CompanyType | null;
  goals: CompanyGoalWithIdType[];
}

const initialState: CompanyState = {
  company: null,
  goals: [],
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setCompany(state, action: PayloadAction<CompanyType>) {
      state.company = action.payload;
      state.goals = action.payload.goals || [];
    },
  },
});

export const { setCompany } = companySlice.actions;
export const selectCompany = (state: RootState) => state.company.company;
export default companySlice.reducer;
