import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CompanyType } from "../utils/types";
import { RootState } from "../utils/store";

interface CompanyState {
  company: CompanyType | null;
}

const initialState: CompanyState = {
  company: null,
};

const companySlice = createSlice({
  name: "company",
  initialState,
  reducers: {
    setCompany(state, action: PayloadAction<CompanyType>) {
      state.company = action.payload;
    },
  },
});

export const { setCompany } = companySlice.actions;
export const selectCompany = (state: RootState) => state.company.company;
export default companySlice.reducer;
