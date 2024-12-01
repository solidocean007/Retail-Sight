import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { GalloGoalsDocument } from "../types";

export const fetchGoalsByCompanyId = async (
  companyId: string
): Promise<GalloGoalsDocument[]> => {
  const goalsCollectionRef = collection(db, "GalloGoals");
  const q = query(goalsCollectionRef, where("companyId", "==", companyId));

  try {
    const querySnapshot = await getDocs(q);

    // Map Firestore documents to the full structure
    const documents: GalloGoalsDocument[] = querySnapshot.docs.map((doc) => ({
      id: doc.id, // Include the Firestore document ID
      ...doc.data(), // Spread the document fields
    })) as GalloGoalsDocument[];

    console.log("Fetched GalloGoals documents:", documents);
    return documents;
  } catch (error) {
    console.error("Error fetching GalloGoals by companyId:", error);
    return [];
  }
};
