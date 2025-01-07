import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { CompanyGoalType } from "../types";

export const fetchCompanyGoalsByCompanyId = async (
  companyId: string
): Promise<CompanyGoalType[]> => {
  const goalsCollectionRef = collection(db, "companyGoals");
  const q = query(goalsCollectionRef, where("companyId", "==", companyId));

  try {
    const querySnapshot = await getDocs(q);

    // Explicitly map and validate the Firestore documents
    const documents: CompanyGoalType[] = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      // Ensure the data matches the expected structure
      if (
        typeof data.companyId === "string" &&
        typeof data.programDetails === "object" &&
        typeof data.goalDetails === "object" &&
        Array.isArray(data.accounts)
      ) {
        return {
          id: data.id,
          companyId: data.companyId,
          goalDescription: data.goalDescription,
          goalMetric: data.goalMetric,
          goalValueMin: data.goalValueMin,
          goalStartDate: data.goalStartDate,
          goalEndDate: data.goalEndDate,
          accounts: data.accounts,
        } as CompanyGoalType;
      } else {
        console.warn("Invalid CompanyGoal document structure:", data);
        throw new Error("Invalid document structure");
      }
    });

    console.log("Fetched ComapnyGoals documents:", documents);
    return documents;
  } catch (error) {
    console.error("Error fetching CompanyGoals by companyId:", error);
    return [];
  }
};
