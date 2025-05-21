import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { CompanyGoalType } from "../types";
import {
  saveGoalsToIndexedDB,
  clearGoalsFromIndexedDB,
} from "../database/indexedDBUtils";
import {
  setCompanyGoals,
  setCompanyGoalsLoading,
  setCompanyGoalsError,
} from "../../Slices/companyGoalsSlice"; // ✅ import error + loading

export const setupCompanyGoalsListener =
  (companyId: string) => (dispatch: any) => {
    const q = query(collection(db, "companyGoals"), where("companyId", "==", companyId));

    dispatch(setCompanyGoalsLoading(true)); // ✅ start loading
    dispatch(setCompanyGoalsError(null));   // ✅ clear error

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const allCompanyGoals = snapshot.docs.map((doc) => ({
            ...(doc.data() as CompanyGoalType),
            id: doc.id,
          }));

          await clearGoalsFromIndexedDB("companyGoals");
          dispatch(setCompanyGoals([]));
          await saveGoalsToIndexedDB(allCompanyGoals, "companyGoals");
          dispatch(setCompanyGoals(allCompanyGoals));
        } catch (error) {
          console.error("Error syncing company goals:", error);
          dispatch(setCompanyGoalsError("Failed to sync goals from Firestore"));
        } finally {
          dispatch(setCompanyGoalsLoading(false)); // ✅ done loading
        }
      },
      (error) => {
        console.error("Error in snapshot listener:", error);
        dispatch(setCompanyGoalsError("Snapshot listener failed"));
        dispatch(setCompanyGoalsLoading(false));
      }
    );

    return () => unsubscribe();
  };

