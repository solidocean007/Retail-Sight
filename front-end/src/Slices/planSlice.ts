import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { PlanType } from "../utils/types";

interface PlanState {
  currentPlan?: PlanType | null;
  loading: boolean;
}

const initialState: PlanState = {
  currentPlan: null,
  loading: false,
};

const planSlice = createSlice({
  name: "plan",
  initialState,
  reducers: {
    setPlan(state, action: PayloadAction<PlanType>) {
      state.currentPlan = action.payload;
      localStorage.setItem("displaygram_plan", JSON.stringify(action.payload));
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    hydrateFromCache(state) {
      try {
        const cached = localStorage.getItem("displaygram_plan");
        if (cached) state.currentPlan = JSON.parse(cached);
      } catch {
        state.currentPlan = null;
      }
    },
  },
});

export const { setPlan, setLoading, hydrateFromCache } = planSlice.actions;
export default planSlice.reducer;
