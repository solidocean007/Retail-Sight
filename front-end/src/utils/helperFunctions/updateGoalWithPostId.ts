import { updateDoc, arrayUnion, doc, getDoc } from "@firebase/firestore";
import { db } from "../firebase";
import { PostType } from "../types";

export const updateGoalWithPostId = async (
  post: PostType,
  postId: string
): Promise<void> => {
  try {
    if (post.companyGoalId) {
      // Update Company Goal
      const goalRef = doc(db, "companyGoals", post.companyGoalId);
      await updateDoc(goalRef, {
        submittedPostsIds: arrayUnion(postId),
      });
    } else if (post.oppId) {
      // Update Gallo Goal
      const galloGoalsRef = doc(db, "galloGoals", post.oppId); // Assuming oppId maps to a goal document
      const galloGoalDoc = await getDoc(galloGoalsRef);

      if (galloGoalDoc.exists()) {
        const updatedAccounts = galloGoalDoc
          .data()
          .accounts.map((account: any) =>
            account.oppId === post.oppId
              ? { ...account, submittedPostId: postId }
              : account
          );

        await updateDoc(galloGoalsRef, { accounts: updatedAccounts });
      }
    }
  } catch (error) {
    console.error("Error updating goal with post ID:", error);
  }
};
