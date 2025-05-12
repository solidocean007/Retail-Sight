import { collection, query, where, getDocs } from "@firebase/firestore";
import { db } from "../firebase";
import { CompanyGoalType } from "../types";

export const fetchCompanyGoalsForAccount = async (
  accountNumber: string | null | undefined,
  companyId: string,
): Promise<CompanyGoalType[]> => {
  try {
    const goalsCollection = collection(db, "companyGoals");

    // Query Firestore to get documents matching the companyId
    const goalsQuery = query(
      goalsCollection,
      where("companyId", "==", companyId),
    );
    const goalsSnapshot = await getDocs(goalsQuery);

    const companyGoals: CompanyGoalType[] = [];
    goalsSnapshot.forEach((doc) => {
      const goalDoc = doc.data() as CompanyGoalType;

      // Filter if the goal applies to the specific account or is global
      if (
        goalDoc.accounts === "Global" || // Applies to all accounts
        (Array.isArray(goalDoc.accounts) &&
          goalDoc.accounts.includes(accountNumber || ""))
      ) {
        companyGoals.push(goalDoc);
      }
    });

    return companyGoals;
  } catch (error) {
    console.error("Error fetching company goals:", error);
    return [];
  }
};
