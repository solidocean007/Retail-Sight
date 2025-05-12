import { collection, query, where, getDocs } from "@firebase/firestore";
import { FireStoreGalloGoalDocType } from "../types";
import { db } from "../firebase";

export const fetchGalloGoalsForAccount = async (
  accountNumber: string | null | undefined,
  companyId: string,
): Promise<FireStoreGalloGoalDocType[]> => {
  try {
    const goalsCollection = collection(db, "galloGoals");

    // Query Firestore to get documents matching the companyId
    const goalsQuery = query(
      goalsCollection,
      where("companyId", "==", companyId),
    );
    const goalsSnapshot = await getDocs(goalsQuery);

    const goals: FireStoreGalloGoalDocType[] = [];
    goalsSnapshot.forEach((doc) => {
      const goalDoc = doc.data() as FireStoreGalloGoalDocType;

      // Filter accounts by distributorAcctId
      const matchingAccounts = goalDoc.accounts.filter(
        (acc) => acc.distributorAcctId.toString() === accountNumber,
      );

      if (matchingAccounts.length > 0) {
        goals.push({
          companyId: goalDoc.companyId,
          goalDetails: {
            goalId: goalDoc.goalDetails.goalId,
            goal: goalDoc.goalDetails.goal,
            goalMetric: goalDoc.goalDetails.goalMetric,
            goalValueMin: goalDoc.goalDetails.goalValueMin,
          },
          programDetails: {
            programId: goalDoc.programDetails.programId,
            programStartDate: goalDoc.programDetails.programStartDate,
            programEndDate: goalDoc.programDetails.programEndDate,
            programTitle: goalDoc.programDetails.programTitle,
          },
          accounts: matchingAccounts.map((account) => ({
            distributorAcctId: account.distributorAcctId,
            accountName: account.accountName,
            accountAddress: account.accountAddress,
            salesRouteNums: account.salesRouteNums || [], // Default to an empty array
            oppId: account.oppId,
            marketId: account.marketId || "Unknown", // Default to "Unknown" if undefined
          })),
        });
      }
    });

    return goals;
  } catch (error) {
    console.error("Error fetching goals:", error);
    return [];
  }
};
