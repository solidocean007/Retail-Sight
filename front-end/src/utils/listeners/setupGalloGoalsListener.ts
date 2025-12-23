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
    console.log('setting up gallo goals listener"') // this doestn log
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
          // const allGalloGoals = snapshot.docs.map((doc) => ({
          //   id: doc.id,
          //   ...(normalizeFirestoreData(
          //     doc.data()
          //   ) as FireStoreGalloGoalDocType),
          // }));

          const allGalloGoals = snapshot.docs
            .map((doc) => {
              const raw = doc.data();
              console.log("RAW DOC", doc.id, raw);

              const data = normalizeFirestoreData(doc.data());
              if (!data?.goalDetails?.goalId) {
                console.warn("Skipping malformed gallo goal", doc.id);
                return null;
              }
              return { id: doc.id, ...data };
            })
            .filter(Boolean);

          dispatch(setGalloGoals(allGalloGoals));
          await saveGoalsToIndexedDB(allGalloGoals, "galloGoals"); // Type '({ id: string; } | null)[]' is not assignable to type 'FireStoreGalloGoalDocType[]'
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
