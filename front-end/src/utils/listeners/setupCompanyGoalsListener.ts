// src/utils/listeners/setupUserCompanyGoalsListener.ts
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../firebase";
import { setCompanyGoals } from "../../Slices/goalsSlice";
import { CompanyGoalType } from "../types";
import {
  saveGoalsToIndexedDB,
  clearGoalsFromIndexedDB,
} from "../database/indexedDBUtils";

export const setupCompanyGoalsListener =
  (companyId: string) => 
    (dispatch: any) => {
    const q = query(
      collection(db, "companyGoals"),
      where("companyId", "==", companyId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        console.log("Company goals listener triggered...");

        // Map the snapshot to company goals
        const allCompanyGoals = snapshot.docs.map((doc) => ({
          ...(doc.data() as CompanyGoalType),
        }));

        console.log("Fetched ALL Company Goals:", allCompanyGoals);

        // Save all company goals to IndexedDB and Redux
        await clearGoalsFromIndexedDB("companyGoals"); // Clear IndexedDB
        dispatch(setCompanyGoals([])); // Clear Redux store before updating

        await saveGoalsToIndexedDB(allCompanyGoals, "companyGoals"); // Save all goals
        dispatch(setCompanyGoals(allCompanyGoals)); // Store all goals in Redux
      },
      (error) => {
        console.error("Error in company goals listener:", error);
      }
    );

    return () => unsubscribe();
  };

