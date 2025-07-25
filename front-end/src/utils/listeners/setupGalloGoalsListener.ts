//src/utils/listeners/setupGalloGoalsListeners.ts
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../firebase";
import {
  clearGoalsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../database/indexedDBUtils";
import { FireStoreGalloGoalDocType } from "../types";
import { setGalloGoals } from "../../Slices/galloGoalsSlice";

export const setupGalloGoalsListener =
  (companyId: string) => (dispatch: any) => {
    if (!companyId) {
      console.warn("Skipping Gallo goals listener: no companyId provided");
      return () => {}; // no-op unsubscribe
    }

    const q = query(
      collection(db, "galloGoals"),
      where("companyId", "==", companyId),
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const allGalloGoals = snapshot.docs.map((doc) => ({
          ...(doc.data() as FireStoreGalloGoalDocType),
          id: doc.id,
        }));

        await clearGoalsFromIndexedDB("galloGoals");
        dispatch(setGalloGoals([]));
        await saveGoalsToIndexedDB(allGalloGoals, "galloGoals");
        dispatch(setGalloGoals(allGalloGoals));
      },
      (error) => {
        console.error("Error in Gallo goals listener:", error);
      },
    );

    return () => unsubscribe();
  };

