import { doc, setDoc } from "@firebase/firestore";
import {
  EnrichedGalloAccountType,
  FireStoreGalloGoalDocType,
  GalloGoalType,
  GalloProgramType,
} from "../types";
import { db } from "../firebase";

export const createGalloGoal = async (
  selectedGoal: GalloGoalType | null,
  selectedProgram: GalloProgramType | null,
  selectedAccounts: EnrichedGalloAccountType[],
  companyId: string,
): Promise<FireStoreGalloGoalDocType> => {
  if (!selectedGoal || !selectedProgram) {
    throw new Error("Selected goal or program is missing.");
  }

  const savedGoal: FireStoreGalloGoalDocType = {
    companyId: companyId,
    programDetails: {
      programId: selectedProgram.programId,
      programTitle: selectedProgram.programTitle,
      programStartDate: selectedProgram.startDate,
      programEndDate: selectedProgram.endDate,
    },
    goalDetails: {
      goalId: selectedGoal.goalId,
      goal: selectedGoal.goal,
      goalMetric: selectedGoal.goalMetric,
      goalValueMin: selectedGoal.goalValueMin,
    },
    accounts: selectedAccounts.map((account) => ({
      distributorAcctId: account.distributorAcctId,
      accountName: account.accountName || "N/A",
      accountAddress: account.accountAddress || "N/A",
      salesRouteNums: account.salesRouteNums || [],
      oppId: account.oppId,
      marketId: account.marketId,
    })),
  };

  try {
    const goalDocRef = doc(db, "galloGoals", selectedGoal.goalId);
    await setDoc(goalDocRef, savedGoal, { merge: true });
    console.log("Goal saved successfully for selected accounts!");
    return savedGoal; // ✅ Return the goal shape for Redux & cache
  } catch (err) {
    console.error("Error saving goal for accounts:", err);
    throw err;
  }
};

