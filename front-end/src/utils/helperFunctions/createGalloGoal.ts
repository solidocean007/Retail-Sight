import { doc, setDoc } from "@firebase/firestore";
import {
  EnrichedGalloAccountType,
  GalloGoalType,
  GalloProgramType,
} from "../types";
import { db } from "../firebase";

export const createGalloGoal = async (
  selectedGoal: GalloGoalType | null,
  selectedProgram: GalloProgramType | null,
  selectedAccounts: EnrichedGalloAccountType[],
  companyId: string,
): Promise<void> => {
  if (!selectedGoal || !selectedProgram) {
    throw new Error("Selected goal or program is missing.");
  }

  try {
    const goalDocRef = doc(db, "galloGoals", selectedGoal.goalId);
    await setDoc(
      goalDocRef,
      {
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
          accountName: account.accountName,
          accountAddress: account.accountAddress,
          salesRouteNums: account.salesRouteNums,
          oppId: account.oppId,
          marketId: account.marketId,
        })),
      },
      { merge: true },
    );
    console.log("Goal saved successfully for selected accounts!");
  } catch (err) {
    console.error("Error saving goal for accounts:", err);
    throw err;
  }
};
