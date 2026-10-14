import {
  CompanyAccountType,
  PostInputType,
  FirestorePostPayload,
} from "../types";
import { extractHashtags, extractStarTags } from "../extractHashtags";
import { Timestamp } from "@firebase/firestore";

/**
 * Firestore rejects undefined at any depth. Account and user records come
 * from several legacy import paths, so optional nested fields cannot be
 * assumed to be clean even when the flattened post fields are normalized.
 * Preserve class instances such as Timestamp and only clean plain objects.
 */
const removeUndefinedFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => removeUndefinedFields(item)) as T;
  }

  if (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, removeUndefinedFields(item)]),
    ) as T;
  }

  return value;
};

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
  const cleanedShareNote = post.shareNote?.trim();
  const shareNoteAudienceCompanyId = account?.originCompanyId;

  const payload = {
    ...(shared.size > 0 && {
      sharedWithCompanies: Array.from(shared),
    }),
    description: cleanedDescription || "",
    ...(cleanedShareNote &&
      shareNoteAudienceCompanyId && {
        shareNote: cleanedShareNote,
        shareNoteAudienceCompanyId,
        shareNoteAudienceCompanyName: account?.originCompanyName ?? "",
      }),
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
    accountNumber: String(account?.accountNumber ?? ""),
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
    // 🍻 Brand fields
    brands: post.brands ?? [], // legacy/display fallback
    brandIds: post.brandIds ?? [], // durable query/filter/share field
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

  return removeUndefinedFields(payload);
};
