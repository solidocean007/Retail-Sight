import {
  CompanyAccountType,
  PostInputType,
  FirestorePostPayload,
} from "../types";
import { extractHashtags, extractStarTags } from "../extractHashtags";
import { serverTimestamp, Timestamp } from "@firebase/firestore";

export const buildPostPayload = (post: PostInputType): FirestorePostPayload => {
  const hashtags = extractHashtags(post.description ?? "");
  const starTags = extractStarTags(post.description ?? "");

  const account = post.account as CompanyAccountType;

  const cleanedDescription = post.description
    ?.replace(/(#|[*])\s+/g, "$1") // Remove spaces after # or *
    .trim(); // Trim any leading/trailing spaces

return {
  description: cleanedDescription || "",
  imageUrl: post.imageUrl || "",
  displayDate: new Date(), // client-side date
  timestamp: Timestamp.now(), // fallback client-side
  createdAt: serverTimestamp(), // ✅ Firestore server timestamp
  updatedAt: serverTimestamp(), // ✅ Firestore server timestamp

  visibility: post.visibility,

  totalCaseCount: post.totalCaseCount ?? 0,

  account: account,

  // 🔗 Flattened account fields
  accountNumber: account?.accountNumber ?? "",
  accountName: account?.accountName ?? "",
  accountAddress: account?.accountAddress ?? "",
  streetAddress: account?.streetAddress ?? "",
  city: account?.city ?? "",
  state: account?.state ?? "",
  accountSalesRouteNums: account?.salesRouteNums ?? [],
  accountType: account?.typeOfAccount ?? "",
  chain: account?.chain ?? "",
  chainType: account?.chainType ?? "",

  companyId: post.postUser?.companyId ?? "", // ✅ ensure top-level

  postUser: post.postUser!,

  // 🔗 Flattened user fields
  postUserUid: post.postUser?.uid ?? "",
  postUserRole: post.postUser?.role ?? "employee",
  postUserFirstName: post.postUser?.firstName ?? "",
  postUserLastName: post.postUser?.lastName ?? "",
  postUserProfileUrlThumbnail: post.postUser?.profileUrlThumbnail ?? "",
  postUserProfileUrlOriginal: post.postUser?.profileUrlOriginal ?? "",
  postUserEmail: post.postUser?.email ?? "",
  postUserPhone: post.postUser?.phone ?? "",
  postUserCompanyName: post.postUser?.company || "",
  postUserCompanyId: post.postUser?.companyId ?? "",
  postUserSalesRouteNum: post.postUser?.salesRouteNum ?? "",

  // ✅ Optional owner context
  postedBy: post.postedBy ?? null,
  postedByFirstName: post.postedBy?.firstName ?? null,
  postedByLastName: post.postedBy?.lastName ?? null,
  postedByUid: post.postedBy?.uid ?? null,

  hashtags,
  starTags,
  brands: post.brands ?? [],
  productNames: post.productNames ?? [],
  productType: post.productType ?? [],
  supplier: post.supplier ?? "",

  // 🎯 Company goal info
  ...(post.companyGoalId && {
    companyGoalId: post.companyGoalId,
    companyGoalTitle: post.companyGoalTitle,
  }),

  // 🍇 Gallo goal info
  ...(post.oppId && {
    oppId: post.oppId,
    galloGoalTitle: post.galloGoalTitle,
    galloGoalId: post.galloGoalId,
    closedBy: post.closedBy ?? null,
    closedUnits: post.totalCaseCount ?? null,
  }),

  likes: [],
  commentCount: 0,
  tokens: [],
} as FirestorePostPayload;

};
