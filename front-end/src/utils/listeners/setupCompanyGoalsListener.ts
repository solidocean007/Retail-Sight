import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../firebase";
import { CompanyGoalType, CompanyGoalWithIdType } from "../types";
import {
  saveGoalsToIndexedDB,
  clearGoalsFromIndexedDB,
} from "../database/indexedDBUtils";
import { setCompanyGoals } from "../../Slices/companyGoalsSlice";

export const setupCompanyGoalsListener =
  (companyId: string) => (dispatch: any) => {
    const q = query(
      collection(db, "companyGoals"),
      where("companyId", "==", companyId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const allCompanyGoals: CompanyGoalWithIdType[] = snapshot.docs.map((doc) => ({
          id: doc.id,  // ✅ Explicitly attach Firestore doc ID
          ...(doc.data() as CompanyGoalType),
        }));

        await clearGoalsFromIndexedDB("companyGoals");
        dispatch(setCompanyGoals([]));

        await saveGoalsToIndexedDB(allCompanyGoals, "companyGoals");
        dispatch(setCompanyGoals(allCompanyGoals));
      },
      (error) => {
        console.error("Error in company goals listener:", error);
      }
    );

    return () => unsubscribe();
  };

