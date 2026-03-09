import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PlanType } from "../utils/types";

interface PlanState {
  currentPlan?: PlanType | null;
  allPlans: Record<string, PlanType>;
  loading: boolean;
}

const initialState: PlanState = {
  currentPlan: null,
  allPlans: {},
  loading: false,
};

const planSlice = createSlice({
  name: "plan",
  initialState,
  reducers: {
    setPlan(state, action: PayloadAction<PlanType>) {
      state.currentPlan = action.payload;
    },
    setAllPlans(state, action: PayloadAction<Record<string, PlanType>>) {
      state.allPlans = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setPlan, setAllPlans, setLoading } = planSlice.actions;
export default planSlice.reducer;