import { collection, getDocs } from "@firebase/firestore";
import { GalloGoalType } from "../types";
import { db } from "../firebase";

export const fetchGoalsForAccount = async (accountNumber: string): Promise<GalloGoalType[]> => {
  try {
    const goalsCollection = collection(db, "GalloGoals");
    const goalsSnapshot = await getDocs(goalsCollection);

    for (const doc of goalsSnapshot.docs) {
      const goal = doc.data() as GalloGoalType;
      const matchingAccount = goal.accounts.find(
        (acc) => acc.distributorAcctId.toString() === accountNumber
      );
      if (matchingAccount) {
        return [{ ...goal, id: doc.id }]; // Return an array containing the matching goal
      }
    }
    return []; // No matching goal found, return an empty array
  } catch (error) {
    console.error("Error fetching goal for account:", error);
    return []; // Return an empty array on error
  }
};
