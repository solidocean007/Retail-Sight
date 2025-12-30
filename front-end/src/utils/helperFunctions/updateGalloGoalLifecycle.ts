import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export const updateGalloGoalLifecycle = async (
  goalId: string,
  status: "active" | "archived" | "disabled"
) => {
  const ref = doc(db, "galloGoals", goalId);
  await updateDoc(ref, {
    lifeCycleStatus: status,
    updatedAt: serverTimestamp(),
  });
  return status;
};

