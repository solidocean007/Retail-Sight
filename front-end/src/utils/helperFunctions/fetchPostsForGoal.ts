import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { GoalSubmission } from "../types"; // Ensure you import your GoalSubmission type

export const fetchPostsForGoal = async (
  goalId: string,
  goalType: "companyGoals" | "galloGoals",
): Promise<GoalSubmission[]> => {
  try {
    // ✅ Correct Firestore reference
    const goalRef = doc(db, goalType, goalId);
    const goalDoc = await getDoc(goalRef);

    if (!goalDoc.exists()) return [];

    const goalData = goalDoc.data();

    return (goalData?.submittedPosts || []) as GoalSubmission[]; // ✅ Ensure correct type casting
  } catch (error) {
    console.error("Error fetching posts for goal:", error);
    return [];
  }
};
