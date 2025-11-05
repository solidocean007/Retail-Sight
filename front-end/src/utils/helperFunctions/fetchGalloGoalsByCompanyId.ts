import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { FireStoreGalloGoalDocType } from "../types";

export const fetchGalloGoalsByCompanyId = async (
  companyId: string,
): Promise<FireStoreGalloGoalDocType[]> => {
  const goalsCollectionRef = collection(db, "galloGoals");
  const q = query(goalsCollectionRef, where("companyId", "==", companyId));

  try {
    const querySnapshot = await getDocs(q);

    // Explicitly map and validate the Firestore documents
    const documents: FireStoreGalloGoalDocType[] = querySnapshot.docs.map(
      (doc) => {
        const data = doc.data();
        // Ensure the data matches the expected structure
        if (
          typeof data.companyId === "string" &&
          typeof data.programDetails === "object" &&
          typeof data.goalDetails === "object" &&
          Array.isArray(data.accounts)
        ) {
          return {
            companyId: data.companyId,
            programDetails: data.programDetails,
            goalDetails: data.goalDetails,
            accounts: data.accounts,
          } as FireStoreGalloGoalDocType;
        } else {
          console.warn("Invalid GalloGoal document structure:", data);
          throw new Error("Invalid document structure");
        }
      },
    );

    console.log("Fetched GalloGoals documents:", documents);
    return documents;
  } catch (error) {
    console.error("Error fetching GalloGoals by companyId:", error);
    return [];
  }
};
