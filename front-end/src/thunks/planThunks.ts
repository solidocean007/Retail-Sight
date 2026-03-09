import { createAsyncThunk } from "@reduxjs/toolkit";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../utils/firebase";
import { setAllPlans } from "../Slices/planSlice";
import { PlanType } from "../utils/types";

export const fetchAllPlans = createAsyncThunk(
  "plans/fetchAll",
  async (_, { dispatch }) => {
    const snap = await getDocs(collection(db, "plans"));

    const plans: Record<string, PlanType> = {};

    snap.forEach((doc) => {
      plans[doc.id] = doc.data() as PlanType;
    });

    dispatch(setAllPlans(plans));
    return plans;
  }
);