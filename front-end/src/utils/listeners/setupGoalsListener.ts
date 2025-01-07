// src/utils/listeners/setupUserGoalsListener.ts
import { collection, onSnapshot, query, where } from "@firebase/firestore";
import { db } from "../firebase";
import {
  getUserAccountsFromIndexedDB,
  saveGoalsToIndexedDB,
  clearGoalsFromIndexedDB,
} from "../database/indexedDBUtils";
import { setGalloGoals } from "../../Slices/goalsSlice";
import { FireStoreGalloGoalDocType } from "../types";

export const setupUserGoalsListener =
  (companyId: string, salesRouteNum: string | undefined) =>
  (dispatch: any) => {
    const q = query(collection(db, "galloGoals"), where("companyId", "==", companyId));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        console.log("User goals listener triggered...");

        const allGoals = snapshot.docs.map((doc) => ({
          ...(doc.data() as FireStoreGalloGoalDocType),
          id: doc.id,
        }));

        // Filter goals for the user's accounts
        const userAccounts = await getUserAccountsFromIndexedDB();
        const userGoals = allGoals.filter((goal) =>
          goal.accounts.some((acc) =>
            userAccounts.some((ua) => String(ua.accountNumber) === String(acc.distributorAcctId))
          )
        );

        console.log("Filtered User Goals:", userGoals); // !!!this logs with all accounts not just the users

        // Clear old goals from IndexedDB and Redux
        await clearGoalsFromIndexedDB(); // Clear IndexedDB
        dispatch(setGalloGoals([])); // Clear Redux goals state

        // Save and dispatch new goals
        await saveGoalsToIndexedDB(userGoals); // Save updated goals to IndexedDB
        dispatch(setGalloGoals(userGoals)); // Update Redux store with new goals
      },
      (error) => {
        console.error("Error in user goals listener:", error);
      }
    );

    return () => unsubscribe();
  };




