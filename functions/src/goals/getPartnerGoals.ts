import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const clean = (value: unknown) => String(value ?? "").trim();

const serializeDate = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  return clean(value);
};

const sanitizeSubmission = (value: unknown) => {
  const submission = (value ?? {}) as Record<string, any>;
  const account = (submission.account ?? {}) as Record<string, unknown>;
  const submittedBy = (submission.submittedBy ?? {}) as Record<string, unknown>;

  return {
    postId: clean(submission.postId),
    submittedAt: serializeDate(submission.submittedAt),
    account: {
      accountName: clean(account.accountName),
      accountAddress: clean(account.accountAddress || account.streetAddress),
    },
    submittedBy: {
      firstName: clean(submittedBy.firstName),
      lastName: clean(submittedBy.lastName),
    },
  };
};

/**
 * Returns a supplier-safe projection of distributor goals intentionally
 * shared with the caller's company. Raw goal documents contain internal
 * assignments, account numbers, and user records and must never be returned.
 */
export const getPartnerGoals = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Auth required.");

  const userSnap = await db.doc(`users/${uid}`).get();
  const supplierCompanyId = clean(userSnap.data()?.companyId);
  if (!supplierCompanyId) {
    throw new HttpsError("permission-denied", "Company membership required.");
  }

  const supplierSnap = await db.doc(`companies/${supplierCompanyId}`).get();
  if (supplierSnap.data()?.companyType !== "supplier") {
    throw new HttpsError(
      "failed-precondition",
      "Partner goals are available to supplier companies only."
    );
  }

  const connectionsSnap = await db
    .collection("companyConnections")
    .where("status", "==", "approved")
    .where("companyIds", "array-contains", supplierCompanyId)
    .get();

  const distributorNames = new Map<string, string>();
  connectionsSnap.docs.forEach((document) => {
    const connection = document.data();
    const supplierIsFrom =
      connection.requestFromCompanyId === supplierCompanyId &&
      connection.requestFromCompanyType === "supplier";
    const supplierIsTo =
      connection.requestToCompanyId === supplierCompanyId &&
      connection.requestToCompanyType === "supplier";

    if (supplierIsFrom && connection.requestToCompanyType === "distributor") {
      distributorNames.set(
        connection.requestToCompanyId,
        clean(connection.requestToCompanyName) || "Connected distributor"
      );
    }

    if (supplierIsTo && connection.requestFromCompanyType === "distributor") {
      distributorNames.set(
        connection.requestFromCompanyId,
        clean(connection.requestFromCompanyName) || "Connected distributor"
      );
    }
  });

  if (distributorNames.size === 0) return { goals: [] };

  const goalsSnap = await db
    .collection("companyGoals")
    .where("supplierIdForGoal", "==", supplierCompanyId)
    .limit(250)
    .get();

  const goals = goalsSnap.docs
    .map((document) => {
      const goal = document.data();
      const distributorCompanyId = clean(goal.companyId);
      const originCompanyName = distributorNames.get(distributorCompanyId);
      if (!originCompanyName || goal.deleted === true) return null;

      const rawSubmissions = Array.isArray(goal.submittedPosts)
        ? goal.submittedPosts
        : [];
      const recentSubmissions = rawSubmissions
        .slice(-100)
        .map(sanitizeSubmission);

      return {
        id: document.id,
        distributorCompanyId,
        originCompanyName,
        goalTitle: clean(goal.goalTitle),
        goalDescription: clean(goal.goalDescription),
        goalMetric: clean(goal.goalMetric),
        goalValueMin: Number(goal.goalValueMin) || 0,
        goalStartDate: clean(goal.goalStartDate),
        goalEndDate: clean(goal.goalEndDate),
        perUserQuota:
          typeof goal.perUserQuota === "number" ? goal.perUserQuota : null,
        submissionCount: rawSubmissions.length,
        submittedPosts: recentSubmissions,
      };
    })
    .filter((goal): goal is NonNullable<typeof goal> => Boolean(goal))
    .sort((a, b) => a.goalTitle.localeCompare(b.goalTitle));

  return { goals };
});
