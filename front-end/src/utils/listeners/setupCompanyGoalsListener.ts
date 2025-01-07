// src/utils/listeners/setupCompanyGoalsListener.ts
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../firebase";
import { setCompanyGoals } from "../../Slices/goalsSlice";
import { CompanyGoalType } from "../types";
import { saveGoalsToIndexedDB, clearGoalsFromIndexedDB } from "../database/indexedDBUtils";

export const setupCompanyGoalsListener = (companyId: string) => (dispatch: any) => {
  const q = query(collection(db, "companyGoals"), where("companyId", "==", companyId));

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      console.log("Company goals listener triggered...");

      // Map the snapshot to company goals
      const allCompanyGoals = snapshot.docs.map((doc) => ({
        ...(doc.data() as CompanyGoalType),
      }));

      console.log("Fetched Company Goals:", allCompanyGoals);

      // Clear old goals from IndexedDB and Redux
      await clearGoalsFromIndexedDB("companyGoals"); // Clear company goals from IndexedDB
      dispatch(setCompanyGoals([])); // Clear Redux company goals state

      // Save and dispatch new goals
      await saveGoalsToIndexedDB(allCompanyGoals, "companyGoals"); // Save updated company goals
      dispatch(setCompanyGoals(allCompanyGoals)); // Update Redux store with new goals
    },
    (error) => {
      console.error("Error in company goals listener:", error);
    }
  );

  return () => unsubscribe();
};
