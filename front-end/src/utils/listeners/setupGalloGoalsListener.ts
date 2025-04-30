
//src/utils/listeners/setupGalloGoalsListeners.ts
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../firebase";
import {
  clearGoalsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../database/indexedDBUtils";
import { setGalloGoals } from "../../Slices/goalsSlice";
import { FireStoreGalloGoalDocType } from "../types";

export const setupGalloGoalsListener =
  (companyId: string) => (dispatch: any) => {
    const q = query(collection(db, "galloGoals"), where("companyId", "==", companyId));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {

        const allGalloGoals = snapshot.docs.map((doc) => ({
          ...(doc.data() as FireStoreGalloGoalDocType),
          id: doc.id,
        }));


        // Clear old goals from IndexedDB and Redux
        await clearGoalsFromIndexedDB("galloGoals"); // Clear IndexedDB
        dispatch(setGalloGoals([])); // Clear Redux before updating

        // Save all goals to IndexedDB and Redux
        await saveGoalsToIndexedDB(allGalloGoals, "galloGoals"); 
        dispatch(setGalloGoals(allGalloGoals)); // Store all Gallo goals in Redux
      },
      (error) => {
        console.error("Error in Gallo goals listener:", error);
      }
    );

    return () => unsubscribe();
  };





