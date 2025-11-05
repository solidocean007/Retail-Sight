import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { CompanyGoalType, CompanyGoalWithIdType } from "../types";
import {
  saveGoalsToIndexedDB,
  clearGoalsFromIndexedDB,
} from "../database/indexedDBUtils";
import {
  setCompanyGoals,
  setCompanyGoalsLoading,
  setCompanyGoalsError,
} from "../../Slices/companyGoalsSlice";
import { normalizeFirestoreData } from "../normalize"; // ✅ add this

export const setupCompanyGoalsListener =
  (companyId: string) => (dispatch: any) => {
    const q = query(
      collection(db, "companyGoals"),
      where("companyId", "==", companyId),
      where("deleted", "==", false)
    );

    dispatch(setCompanyGoalsLoading(true));
    dispatch(setCompanyGoalsError(null));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          // ✅ Normalize all timestamps in every document (recursively)
          const allCompanyGoals: CompanyGoalWithIdType[] = snapshot.docs.map(
            (docSnap) => {
              const normalizedData = normalizeFirestoreData(
                docSnap.data()
              ) as CompanyGoalType;
              return {
                id: docSnap.id,
                ...normalizedData,
              };
            }
          );

          await clearGoalsFromIndexedDB("companyGoals");
          dispatch(setCompanyGoals([]));
          await saveGoalsToIndexedDB(allCompanyGoals, "companyGoals");
          dispatch(setCompanyGoals(allCompanyGoals));
        } catch (error) {
          console.error("Error syncing company goals:", error);
          dispatch(setCompanyGoalsError("Failed to sync goals from Firestore"));
        } finally {
          dispatch(setCompanyGoalsLoading(false));
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
