import { PostWithID, PlaybookPostSnapshot } from "../../utils/types";

export const buildPlaybookPostSnapshot = (
  post: PostWithID,
): PlaybookPostSnapshot => {
  return {
    postId: post.id,

    imageUrl: post.imageUrl || "",
    originalImageUrl: post.originalImageUrl || "",

    accountName: post.accountName || post.account?.accountName || "",
    accountNumber:
      post.accountNumber?.toString() ||
      post.account?.accountNumber?.toString() ||
      "",
    accountAddress: post.accountAddress || post.account?.accountAddress || "",
    city: post.city || post.account?.city || "",
    state: post.state || post.account?.state || "",
    chain: post.chain || post.account?.chain || "",
    chainType: post.chainType || post.account?.chainType || "",

    brands: post.brands ?? [],
    brandIds: post.brandIds ?? [],
    productType: post.productType ?? [],

    description: post.description || "",
    totalCaseCount: Number(post.totalCaseCount ?? 0),

    postUserUid: post.postUserUid || post.postUser?.uid || "",
    postUserFirstName:
      post.postUserFirstName || post.postUser?.firstName || "",
    postUserLastName:
      post.postUserLastName || post.postUser?.lastName || "",
    postUserCompanyName:
      post.postUserCompanyName || post.postUser?.company || "",

    displayDate:
      typeof post.displayDate === "string"
        ? post.displayDate
        : post.displayDate?.toDate?.()?.toISOString?.() || "",

    addedToPlaybookAt: new Date().toISOString(),
  };
};