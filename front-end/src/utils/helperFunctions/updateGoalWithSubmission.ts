// front-end/src/utils/helperFunctions/updateGoalWithSubmission.ts
import { updateDoc, arrayUnion, doc, getDoc } from "@firebase/firestore";
import { db } from "../firebase";
import { PostType, GoalSubmissionType } from "../types";

export const updateGoalWithSubmission = async (
  post: PostType,
  postId: string,
): Promise<void> => {
  try {
    const submission: GoalSubmissionType = {
      postId,
      submittedAt: new Date().toISOString(),
      submittedBy: post.postedFor ?? post.createdBy, // ✅ Use full object
      account: post.account ?? {
        accountNumber: "",
        accountName: "",
        accountAddress: "",
        salesRouteNums: [],
      }, // ✅ If somehow missing, fallback to empty
    };

    if (post.companyGoalId) {
      // ✅ **Update Company Goal**
      const goalRef = doc(db, "companyGoals", post.companyGoalId);
      await updateDoc(goalRef, {
        submittedPosts: arrayUnion(submission), // Ensure Firestore stores it as an array
      });
    } else if (post.oppId) {
      // ✅ **Update Gallo Goal**
      const galloGoalsRef = doc(db, "galloGoals", post.oppId);
      const galloGoalDoc = await getDoc(galloGoalsRef);

      if (galloGoalDoc.exists()) {
        const goalData = galloGoalDoc.data();

        const updatedAccounts = goalData.accounts.map((account: any) =>
          account.oppId === post.oppId
            ? { ...account, submittedPost: submission } // Add `submittedPost` to the matching account
            : account,
        );

        await updateDoc(galloGoalsRef, { accounts: updatedAccounts });
      }
    }
  } catch (error) {
    console.error("Error updating goal with submitted post:", error);
  }
};
