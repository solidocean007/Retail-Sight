import {
  CompanyAccountType,
  PostInputType,
  FirestorePostPayload,
} from "../types";
import { extractHashtags, extractStarTags } from "../extractHashtags";
import { Timestamp } from "@firebase/firestore";

export const buildPostPayload = (
  post: PostInputType,
  goal?: { supplierIdForGoal?: string | null },
): FirestorePostPayload => {
  const hashtags = extractHashtags(post.description ?? "");
  const starTags = extractStarTags(post.description ?? "");
 const shared = new Set<string>();
  const account = post.account as CompanyAccountType;

  if (goal?.supplierIdForGoal) {
    shared.add(goal.supplierIdForGoal);
  }

  const cleanedDescription = post.description
    ?.replace(/(#|[*])\s+/g, "$1") // Remove spaces after # or *
    .trim(); // Trim any leading/trailing spaces

  return {
    ...(shared.size > 0 && {
      sharedWithCompanies: Array.from(shared),
    }),
    description: cleanedDescription || "",
    companyId: post.postUser?.companyId || "",
    imageUrl: post.imageUrl || "",

    // 🕓 Required Firestore timestamp fields
    displayDate: new Date(),
    timestamp: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),

    migratedVisibility: post.migratedVisibility as
      | "public"
      | "companyOnly"
      | "network",

    totalCaseCount: post.totalCaseCount ?? 0,
    account,

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

    // 🔗 Flattened user fields
    postUser: post.postUser!,
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
    autoDetectedBrands: post.autoDetectedBrands ?? [],
    productNames: post.productNames ?? [],
    productType: post.productType ?? [],
    supplier: post.supplier ?? "",

    // 🎯 Company goal info
    ...(post.companyGoalId && {
      companyGoalId: post.companyGoalId,
      companyGoalTitle: post.companyGoalTitle,
    }),

    // 🍇 Gallo goal (DENORMALIZED + NESTED)
    ...(post.galloGoal && {
      galloGoalId: post.galloGoal.goalId, // ✅ REQUIRED
      galloGoalTitle: post.galloGoal.title, // ✅ strongly recommended
      galloGoalEnv: post.galloGoal.env ?? "prod", // optional, future-proof

      galloGoal: {
        goalId: post.galloGoal.goalId,
        title: post.galloGoal.title,
        env: post.galloGoal.env,
        oppId: post.galloGoal.oppId,
      },
    }),

    likes: [],
    commentCount: 0,
    tokens: [],
  } satisfies FirestorePostPayload;
};
