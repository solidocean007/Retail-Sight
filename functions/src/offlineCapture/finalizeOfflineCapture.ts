import * as admin from "firebase-admin";
import { randomUUID } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getDownloadURL } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  sendGalloAchievementForCompany,
  type GalloAchievementData,
} from "../galloKeys/galloSendAchievment";

if (!admin.apps.length) admin.initializeApp();

const db = admin.firestore();
const bucket = admin.storage().bucket();
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const CAPTURE_ID_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ON_BEHALF_ROLES = new Set(["admin", "super-admin", "supervisor"]);

type UnknownRecord = Record<string, unknown>;

type FinalizeOfflineCaptureData = {
  captureId?: unknown;
  capturedAt?: unknown;
  storagePath?: unknown;
  postPayload?: unknown;
};

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};

const cleanString = (
  value: unknown,
  maxLength: number,
  fallback = ""
): string => {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, maxLength);
};

const cleanStringArray = (
  value: unknown,
  maxItems: number,
  maxLength: number
): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, maxLength))
        .filter(Boolean)
    )
  ).slice(0, maxItems);
};

const cleanAccountNumber = (value: unknown): string =>
  typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : cleanString(value, 120);

const timestampString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }
  return null;
};

const safeUser = (uid: string, source: UnknownRecord): UnknownRecord => ({
  uid,
  role: cleanString(source.role, 32, "employee"),
  createdAt: timestampString(source.createdAt),
  updatedAt: timestampString(source.updatedAt),
  firstName: cleanString(source.firstName, 80),
  lastName: cleanString(source.lastName, 80),
  profileUrlThumbnail: cleanString(source.profileUrlThumbnail, 2048),
  profileUrlOriginal: cleanString(source.profileUrlOriginal, 2048),
  email: cleanString(source.email, 320),
  company: cleanString(source.company, 160),
  companyId: cleanString(source.companyId, 128),
  salesRouteNum: cleanString(source.salesRouteNum, 80),
  phone: cleanString(source.phone, 40),
  status: cleanString(source.status, 24, "active"),
  verified: source.verified === true,
});

const safeAccount = (value: unknown): UnknownRecord => {
  const account = asRecord(value);
  const accountNumber = cleanAccountNumber(account.accountNumber);
  const accountName = cleanString(account.accountName, 240);
  if (!accountNumber || !accountName) {
    throw new HttpsError(
      "invalid-argument",
      "A valid store must be selected before this post can sync."
    );
  }

  return {
    accountNumber,
    accountName,
    accountAddress: cleanString(account.accountAddress, 500),
    streetAddress: cleanString(account.streetAddress, 240),
    salesRouteNums: cleanStringArray(account.salesRouteNums, 100, 80),
    city: cleanString(account.city, 120),
    state: cleanString(account.state, 80),
    postalCode: cleanString(account.postalCode, 24),
    typeOfAccount: cleanString(account.typeOfAccount, 80),
    chain: cleanString(account.chain, 160),
    chainType: cleanString(account.chainType, 40),
  };
};

const assertActiveMembership = (
  user: UnknownRecord,
  expectedCompanyId?: string
): string => {
  const companyId = cleanString(user.companyId, 128);
  const status = cleanString(user.status, 24, "active");
  const role = cleanString(user.role, 32, "employee");
  if (!companyId || (expectedCompanyId && companyId !== expectedCompanyId)) {
    throw new HttpsError(
      "permission-denied",
      "Your company membership changed before this post could upload."
    );
  }
  if (
    ["deleted", "inactive", "pending"].includes(status) ||
    role === "status-pending"
  ) {
    throw new HttpsError(
      "permission-denied",
      "Your account is not active, so this saved post cannot upload."
    );
  }
  return companyId;
};

const validatedCapturedAt = (value: unknown): admin.firestore.Timestamp => {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "Missing capture date.");
  }
  const date = new Date(value);
  const now = Date.now();
  if (
    Number.isNaN(date.getTime()) ||
    date.getTime() > now + 5 * 60_000 ||
    date.getTime() < now - 90 * 24 * 60 * 60_000
  ) {
    throw new HttpsError("invalid-argument", "Invalid capture date.");
  }
  return Timestamp.fromDate(date);
};

const extractHashtags = (description: string): string[] =>
  Array.from(description.matchAll(/#([^\s#*]+)/g), (match) => match[1]).slice(
    0,
    50
  );

const extractStarTags = (description: string): string[] =>
  Array.from(description.matchAll(/\*([^\s#*]+)/g), (match) => match[1]).slice(
    0,
    50
  );

const formatGalloClosedDate = (value: unknown, fallback: Date): string => {
  const requested = typeof value === "string" ? new Date(value) : fallback;
  const date = Number.isNaN(requested.getTime()) ? fallback : requested;
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${month}-${day}-${date.getUTCFullYear()}`;
};

const markGalloGoalAccountSubmitted = async (
  goalId: string,
  accountNumber: string,
  oppId: string,
  postId: string
): Promise<void> => {
  if (!goalId || (!accountNumber && !oppId)) return;
  const goalRef = db.doc(`galloGoals/${goalId}`);

  await db.runTransaction(async (transaction) => {
    const goalSnap = await transaction.get(goalRef);
    if (!goalSnap.exists) throw new Error("Gallo goal not found");

    const accounts = goalSnap.data()?.accounts;
    if (!Array.isArray(accounts))
      throw new Error("Gallo goal accounts missing");

    let matched = false;
    const updatedAccounts = accounts.map((candidate) => {
      const account = asRecord(candidate);
      const matchesAccount =
        (accountNumber &&
          cleanAccountNumber(account.distributorAcctId) === accountNumber) ||
        (oppId && cleanString(account.oppId, 240) === oppId);
      if (!matchesAccount) return candidate;
      matched = true;
      return { ...account, submittedPostId: postId };
    });

    if (!matched) throw new Error("Gallo goal account not found");
    transaction.update(goalRef, { accounts: updatedAccounts });
  });
};

export const finalizeOfflineCapture = onCall<FinalizeOfflineCaptureData>(
  { region: "us-central1", timeoutSeconds: 120, memory: "512MiB" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in to upload saved posts.");
    }

    const uid = request.auth.uid;
    const captureId = cleanString(request.data.captureId, 128);
    const storagePath = cleanString(request.data.storagePath, 1024);
    const input = asRecord(request.data.postPayload);
    const capturedAt = validatedCapturedAt(request.data.capturedAt);
    if (!CAPTURE_ID_PATTERN.test(captureId)) {
      throw new HttpsError("invalid-argument", "Invalid capture identifier.");
    }

    const userRef = db.doc(`users/${uid}`);
    const initialUserSnap = await userRef.get();
    if (!initialUserSnap.exists) {
      throw new HttpsError("permission-denied", "User profile not found.");
    }
    const initialUser = initialUserSnap.data() || {};
    const companyId = assertActiveMembership(initialUser);
    const galloGoal = asRecord(input.galloGoal);
    const galloGoalId = cleanString(galloGoal.goalId, 160);
    const galloOppId = cleanString(galloGoal.oppId, 240);
    const galloEnv: "prod" | "dev" =
      cleanString(galloGoal.env, 8) === "dev" ? "dev" : "prod";
    const requestedAccountNumber = cleanAccountNumber(
      asRecord(input.account).accountNumber
    );
    const userDisplayName =
      `${cleanString(initialUser.firstName, 80)} ${cleanString(
        initialUser.lastName,
        80
      )}`.trim();
    const galloAchievement: GalloAchievementData | null = galloOppId
      ? {
          env: galloEnv,
          oppId: galloOppId,
          closedBy:
            cleanString(input.closedBy, 160) ||
            userDisplayName ||
            cleanString(initialUser.email, 320),
          closedDate: formatGalloClosedDate(
            input.closedDate,
            capturedAt.toDate()
          ),
          closedUnits: Number(input.totalCaseCount || 0),
          photos: [],
        }
      : null;
    const receiptRef = db.doc(`offlineCaptureReceipts/${uid}_${captureId}`);
    const existingReceipt = await receiptRef.get();
    if (existingReceipt.exists) {
      return {
        postId: cleanString(existingReceipt.data()?.postId, 128, captureId),
        alreadyFinalized: true,
      };
    }
    const expectedPrefix = `offlineUploads/${companyId}/${uid}/${captureId}/`;
    if (!storagePath.startsWith(expectedPrefix)) {
      throw new HttpsError("permission-denied", "Invalid saved-photo path.");
    }

    const sourceFile = bucket.file(storagePath);
    const [exists] = await sourceFile.exists();
    if (!exists) {
      throw new HttpsError(
        "not-found",
        "The saved photo was not found. Keep it on this device and try again."
      );
    }
    const [metadata] = await sourceFile.getMetadata();
    const contentType = metadata.contentType || "";
    const size = Number(metadata.size || 0);
    if (
      !ALLOWED_IMAGE_TYPES.has(contentType) ||
      size <= 0 ||
      size > MAX_IMAGE_BYTES
    ) {
      throw new HttpsError(
        "invalid-argument",
        "The saved photo type or size is not supported."
      );
    }
    if (
      metadata.metadata?.captureId !== captureId ||
      metadata.metadata?.ownerUid !== uid ||
      metadata.metadata?.companyId !== companyId
    ) {
      throw new HttpsError(
        "permission-denied",
        "Saved-photo ownership mismatch."
      );
    }

    const sourceExtension = storagePath.split(".").pop() || "jpg";
    const finalStoragePath = `displayImages/${companyId}/${uid}/${captureId}/original.${sourceExtension}`;
    const finalFile = bucket.file(finalStoragePath);
    const [finalExists] = await finalFile.exists();
    if (!finalExists) {
      await sourceFile.copy(finalFile, {
        contentType,
        metadata: {
          captureId,
          companyId,
          ownerUid: uid,
          firebaseStorageDownloadTokens: randomUUID(),
        },
      });
    }
    const imageUrl = await getDownloadURL(finalFile);

    const postRef = db.doc(`posts/${captureId}`);
    let alreadyFinalized = false;

    await db.runTransaction(async (transaction) => {
      const receiptSnap = await transaction.get(receiptRef);
      if (receiptSnap.exists) {
        alreadyFinalized = true;
        return;
      }

      const currentUserSnap = await transaction.get(userRef);
      if (!currentUserSnap.exists) {
        throw new HttpsError("permission-denied", "User profile not found.");
      }
      const currentUser = currentUserSnap.data() || {};
      assertActiveMembership(currentUser, companyId);

      const requestedPostUser = asRecord(input.postUser);
      const targetUid = cleanString(requestedPostUser.uid, 128, uid) || uid;
      let targetUser = currentUser;
      if (targetUid !== uid) {
        if (!ON_BEHALF_ROLES.has(cleanString(currentUser.role, 32))) {
          throw new HttpsError(
            "permission-denied",
            "You are not allowed to post for another user."
          );
        }
        const targetSnap = await transaction.get(db.doc(`users/${targetUid}`));
        if (!targetSnap.exists) {
          throw new HttpsError(
            "not-found",
            "The selected user no longer exists."
          );
        }
        targetUser = targetSnap.data() || {};
        assertActiveMembership(targetUser, companyId);
      }

      let account = safeAccount(input.account);
      const companyRef = db.doc(`companies/${companyId}`);
      const companySnap = await transaction.get(companyRef);
      if (!companySnap.exists) {
        throw new HttpsError("permission-denied", "Company not found.");
      }
      const company = companySnap.data() || {};
      const accountNumber = cleanAccountNumber(account.accountNumber);
      const isManualAccount = account.typeOfAccount === "manual";
      let newManualAccountRef: admin.firestore.DocumentReference | null = null;

      if (isManualAccount) {
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(accountNumber)) {
          throw new HttpsError("invalid-argument", "Invalid manual store ID.");
        }
        const manualAccountRef = db.doc(
          `companies/${companyId}/customAccounts/${accountNumber}`
        );
        const manualAccountSnap = await transaction.get(manualAccountRef);
        if (manualAccountSnap.exists) {
          account = safeAccount({
            ...manualAccountSnap.data(),
            accountNumber,
          });
        } else {
          newManualAccountRef = manualAccountRef;
        }
      } else {
        const accountsId = cleanString(company.accountsId, 128);
        if (!accountsId) {
          throw new HttpsError(
            "failed-precondition",
            "Your company's store list is not available."
          );
        }
        const accountsSnap = await transaction.get(
          db.doc(`accounts/${accountsId}`)
        );
        const accounts = accountsSnap.data()?.accounts;
        const matchedAccount = Array.isArray(accounts)
          ? accounts.find(
              (candidate) =>
                cleanAccountNumber(asRecord(candidate).accountNumber) ===
                accountNumber
            )
          : undefined;
        if (!matchedAccount) {
          throw new HttpsError(
            "failed-precondition",
            "The selected store is no longer available to your company."
          );
        }
        account = safeAccount(matchedAccount);
      }

      const brands = cleanStringArray(input.brands, 100, 160);
      const brandIds = cleanStringArray(input.brandIds, 100, 160);
      const productTypes = cleanStringArray(input.productType, 100, 160);
      if (brands.length === 0 || productTypes.length === 0) {
        throw new HttpsError(
          "invalid-argument",
          "At least one brand and product type are required."
        );
      }

      const description = cleanString(input.description, 5000).replace(
        /(#|\*)\s+/g,
        "$1"
      );
      const requestedVisibility = cleanString(input.migratedVisibility, 24);
      const migratedVisibility = ["public", "companyOnly", "network"].includes(
        requestedVisibility
      )
        ? requestedVisibility
        : "network";
      const postUser = safeUser(targetUid, targetUser);
      const postedBy = safeUser(uid, currentUser);
      const totalCaseCount = Number(input.totalCaseCount || 0);
      if (
        !Number.isFinite(totalCaseCount) ||
        totalCaseCount < 0 ||
        totalCaseCount > 1_000_000
      ) {
        throw new HttpsError("invalid-argument", "Invalid case count.");
      }

      const companyGoalId = cleanString(input.companyGoalId, 128);
      let goalRef: admin.firestore.DocumentReference | null = null;
      let goalData: UnknownRecord | null = null;
      if (companyGoalId) {
        goalRef = db.doc(`companyGoals/${companyGoalId}`);
        const goalSnap = await transaction.get(goalRef);
        if (!goalSnap.exists || goalSnap.data()?.companyId !== companyId) {
          throw new HttpsError(
            "failed-precondition",
            "The selected goal is no longer available to your company."
          );
        }
        goalData = goalSnap.data() || {};
      }

      const postPayload: UnknownRecord = {
        description,
        companyId,
        imageUrl,
        originalImageUrl: imageUrl,
        displayDate: capturedAt,
        timestamp: capturedAt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        migratedVisibility,
        totalCaseCount,
        account,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountAddress: account.accountAddress,
        streetAddress: account.streetAddress,
        city: account.city,
        state: account.state,
        accountSalesRouteNums: account.salesRouteNums,
        accountType: account.typeOfAccount,
        chain: account.chain,
        chainType: account.chainType,
        postUser,
        postUserUid: targetUid,
        postUserRole: postUser.role,
        postUserFirstName: postUser.firstName,
        postUserLastName: postUser.lastName,
        postUserProfileUrlThumbnail: postUser.profileUrlThumbnail,
        postUserProfileUrlOriginal: postUser.profileUrlOriginal,
        postUserEmail: postUser.email,
        postUserPhone: postUser.phone,
        postUserCompanyName: postUser.company,
        postUserCompanyId: companyId,
        postUserSalesRouteNum: postUser.salesRouteNum,
        postedBy,
        postedByFirstName: postedBy.firstName,
        postedByLastName: postedBy.lastName,
        postedByUid: uid,
        hashtags: extractHashtags(description),
        starTags: extractStarTags(description),
        brands,
        brandIds,
        autoDetectedBrands: cleanStringArray(
          input.autoDetectedBrands,
          100,
          160
        ),
        productNames: cleanStringArray(input.productNames, 100, 160),
        productType: productTypes,
        supplier: cleanString(input.supplier, 160),
        likes: [],
        commentCount: 0,
        tokens: [],
        offlineCaptureId: captureId,
        offlineCaptureOwnerUid: uid,
        offlineCaptureSchemaVersion: 1,
      };
      if (companyGoalId) {
        postPayload.companyGoalId = companyGoalId;
        postPayload.companyGoalTitle = cleanString(
          goalData?.goalTitle,
          240,
          cleanString(input.companyGoalTitle, 240)
        );
        const supplierId = cleanString(goalData?.supplierIdForGoal, 128);
        if (supplierId) postPayload.sharedWithCompanies = [supplierId];
      }

      if (galloGoalId) {
        postPayload.galloGoalId = galloGoalId;
        postPayload.galloGoalTitle = cleanString(galloGoal.title, 240);
        postPayload.galloGoalEnv = galloEnv;
        postPayload.galloGoal = {
          goalId: galloGoalId,
          title: cleanString(galloGoal.title, 240),
          env: galloEnv,
          oppId: galloOppId,
        };
        postPayload.galloFollowUpStatus = "pending";
      }

      transaction.create(postRef, postPayload);
      if (newManualAccountRef) {
        transaction.create(newManualAccountRef, {
          ...account,
          createdBy: uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      if (goalRef) {
        transaction.update(goalRef, {
          submittedPosts: FieldValue.arrayUnion({
            postId: captureId,
            submittedAt: capturedAt,
            submittedBy: postUser,
            account,
          }),
        });
      }
      transaction.create(receiptRef, {
        captureId,
        companyId,
        ownerUid: uid,
        postId: captureId,
        finalStoragePath,
        createdAt: FieldValue.serverTimestamp(),
        galloFollowUpRequired: Boolean(galloGoalId),
        galloFollowUpStatus: galloGoalId ? "pending" : "not_required",
        galloFollowUpAttempts: 0,
        schemaVersion: 1,
      });
    });

    const recordGalloFollowUpStatus = async (
      status: "processing" | "sent" | "failed" | "sent_goal_update_failed",
      errorCode?: string,
      incrementAttempt = false
    ): Promise<void> => {
      const sharedUpdate: UnknownRecord = {
        galloFollowUpStatus: status,
        galloFollowUpUpdatedAt: FieldValue.serverTimestamp(),
        galloFollowUpLastErrorCode: errorCode || FieldValue.delete(),
      };
      await Promise.all([
        receiptRef.set(
          {
            ...sharedUpdate,
            ...(incrementAttempt
              ? { galloFollowUpAttempts: FieldValue.increment(1) }
              : {}),
          },
          { merge: true }
        ),
        postRef.set(sharedUpdate, { merge: true }),
      ]);
    };

    if (!alreadyFinalized && galloGoalId) {
      let achievementSent = false;
      try {
        await recordGalloFollowUpStatus("processing", undefined, true);
        if (!galloAchievement) {
          throw new Error("Missing Gallo opportunity ID");
        }

        await sendGalloAchievementForCompany(companyId, {
          ...galloAchievement,
          photos: [{ file: imageUrl }],
        });
        achievementSent = true;

        await markGalloGoalAccountSubmitted(
          galloGoalId,
          requestedAccountNumber,
          galloOppId,
          captureId
        );
        await recordGalloFollowUpStatus("sent");
      } catch (error) {
        const status = achievementSent ? "sent_goal_update_failed" : "failed";
        const errorCode = achievementSent
          ? "gallo_goal_update_failed"
          : galloAchievement
            ? "gallo_send_failed"
            : "gallo_opportunity_missing";
        console.warn("Offline Gallo follow-up needs attention", {
          captureId,
          status,
          error,
        });
        await recordGalloFollowUpStatus(status, errorCode).catch(
          (statusError) => {
            console.warn("Offline Gallo status update failed", {
              captureId,
              statusError,
            });
          }
        );
      }
    }

    await sourceFile.delete({ ignoreNotFound: true }).catch((error) => {
      console.warn("Offline capture staging cleanup failed", {
        captureId,
        error,
      });
    });

    return { postId: captureId, alreadyFinalized };
  }
);
