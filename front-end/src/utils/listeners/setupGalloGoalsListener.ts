// src/utils/listeners/setupGalloGoalsListener.ts
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../firebase";
import {
  clearGoalsFromIndexedDB,
  saveGoalsToIndexedDB,
} from "../database/indexedDBUtils";
import { FireStoreGalloGoalDocType } from "../types";
import { setGalloGoals } from "../../Slices/galloGoalsSlice";
import { normalizeFirestoreData } from "../normalize"; // ✅ Add this

export const setupGalloGoalsListener =
  (companyId: string) => (dispatch: any) => {
    if (!companyId) {
      console.warn("Skipping Gallo goals listener: no companyId provided");
      return () => {}; // no-op unsubscribe
    }

    const q = query(
      collection(db, "galloGoals"),
      where("companyId", "==", companyId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          // ✅ Deep normalize all timestamps for each document
          const allGalloGoals = snapshot.docs.map((doc) => {
            const normalizedData = normalizeFirestoreData(
              doc.data()
            ) as FireStoreGalloGoalDocType;
            return {
              id: doc.id,
              ...normalizedData,
            };
          });

          // ✅ IndexedDB and Redux updates
          await clearGoalsFromIndexedDB("galloGoals");
          dispatch(setGalloGoals([]));
          await saveGoalsToIndexedDB(allGalloGoals, "galloGoals");
          dispatch(setGalloGoals(allGalloGoals));
        } catch (error) {
          console.error("Error syncing Gallo goals:", error);
        }
      },
      (error) => {
        console.error("Error in Gallo goals listener:", error);
      }
    );

    return () => unsubscribe();
  };
