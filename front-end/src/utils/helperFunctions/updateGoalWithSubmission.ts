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
      accountNumber: post.account?.accountNumber || "",
      submittedAt: new Date().toISOString(),
      submittedBy: post.postedFor
        ? {
            uid: post.postedFor.uid,
            firstName: post.postedFor.firstName || "",
            lastName: post.postedFor.lastName || "",
            email: post.postedFor.email || "",
            company: post.postedFor.company,
            companyId: post.postedFor.companyId,
            role: post.postedFor.role,
            salesRouteNum: post.postedFor.salesRouteNum || "",
            phone: post.postedFor.phone || "",
          }
        : {
            uid: post.createdBy.uid,
            firstName: post.createdBy.firstName || "",
            lastName: post.createdBy.lastName || "",
            email: post.createdBy.email || "",
            company: post.createdBy.company,
            companyId: post.createdBy.companyId,
            role: post.createdBy.role,
            salesRouteNum: post.createdBy.salesRouteNum || "",
            phone: post.createdBy.phone || "",
          },
      account: post.account
        ? {
            accountNumber: post.account.accountNumber,
            accountName: post.account.accountName,
            accountAddress: post.account.accountAddress,
            salesRouteNums: post.account.salesRouteNums || [],
          }
        : {
            accountNumber: "",
            accountName: "",
            accountAddress: "",
            salesRouteNums: [],
          },
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
            : account
        );

        await updateDoc(galloGoalsRef, { accounts: updatedAccounts });
      }
    }
  } catch (error) {
    console.error("Error updating goal with submitted post:", error);
  }
};
