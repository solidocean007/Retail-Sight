import { deleteDoc, doc } from "@firebase/firestore";
import { db } from "../firebase";

export const deleteCompanyGoalFromFirestore = async (goalId: string): Promise<void> => {
  try {
    const goalDocRef = doc(db, "companyGoals", goalId);
    await deleteDoc(goalDocRef);
    console.log(`Goal with ID ${goalId} deleted from Firestore.`);
  } catch (error) {
    console.error("Error deleting goal from Firestore:", error);
    throw error;
  }
};
