import { collection, query, where, getDocs } from "firebase/firestore";
import { GalloGoalType } from "../types";
import { db } from "../firebase";

export const fetchGoalsByCompanyId = async (companyId: string): Promise<GalloGoalType[]> => {
  const goalsCollectionRef = collection(db, "GalloGoals");
  const q = query(goalsCollectionRef, where("companyId", "==", companyId));

  try {
    const querySnapshot = await getDocs(q);
    const goals = querySnapshot.docs.map((doc) => doc.data() as GalloGoalType);
    console.log("Fetched goals:", goals);
    return goals;
  } catch (error) {
    console.error("Error fetching goals by companyId:", error);
    return [];
  }
};
