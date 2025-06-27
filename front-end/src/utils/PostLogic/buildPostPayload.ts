import {
  PostType,
  CompanyAccountType,
  UserType,
  PostInputType,
  FirestorePostPayload,
} from "../types";
import { extractHashtags, extractStarTags } from "../extractHashtags";



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
    displayDate: new Date(),
    timestamp: new Date(),
    visibility: post.visibility as
      | "public"
      | "company"
      | "supplier"
      | "private",
    totalCaseCount: post.totalCaseCount ?? 0,

    account: account,


    // 🔗 Flattened account fields
    accountNumber: account?.accountNumber ?? "",
    accountName: account?.accountName ?? "",
    accountAddress: account?.accountAddress ?? "",
    accountSalesRouteNums: account?.salesRouteNums ?? [],
    accountType: account?.typeOfAccount ?? "",
    chain: account?.chain ?? "",
    chainType: account?.chainType ?? "",

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

    // 🎯 Goal info
    companyGoalId: post.companyGoalId ?? null,
    companyGoalTitle: post.companyGoalTitle ?? null,
    companyGoalDescription: post.companyGoalDescription ?? null,
    oppId: post.oppId ?? null,

    likes: [],
    commentCount: 0,
    tokens: [],
  } as FirestorePostPayload;
};
