// functions/src/gallo.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";

/**
 * Fetch the companyId for the authenticated user.
 *
 * @param {string} uid - The authenticated user's UID.
 * @returns {Promise<string>} The companyId associated with the user.
 * @throws If companyId is missing.
 */
async function getCompanyId(uid: string): Promise<string> {
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const companyId = userSnap.data()?.companyId;
  if (!companyId) throw new Error("Missing companyId");
  return companyId;
}

/**
 * Returns the Gallo API configuration (keys + orgCode)
 * stored under apiKeys/{companyId}.gallo.
 *
 * @param {string} companyId - The company Firestore document ID.
 * @returns {Promise<any>} The gallo config object.
 * @throws If no gallo object exists.
 */
async function getGalloConfig(companyId: string): Promise<any> {
  const snap = await admin.firestore().doc(`apiKeys/${companyId}`).get();
  const gallo = snap.data()?.gallo;
  if (!gallo) throw new Error("No gallo config exists");
  return gallo;
}

/**
 * Returns the correct base URL for the selected environment.
 *
 * @param {"prod" | "dev"} env - Environment key.
 * @returns {string} Matching base URL for Gallo API.
 */
function getBaseUrl(env: "prod" | "dev"): string {
  return env === "prod"
    ? "https://q2zgrnmnvl.execute-api.us-west-2.amazonaws.com"
    : "https://6w7u156vcb.execute-api.us-west-2.amazonaws.com";
}

/**
 * Generic fetch wrapper for calling Gallo API endpoints.
 *
 * @param {string} url - Full Gallo API request URL.
 * @param {string} apiKey - The API key for authentication.
 * @returns {Promise<any>} Parsed JSON response.
 * @throws If upstream request is not OK.
 */
async function galloFetch(url: string, apiKey: string): Promise<any> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gallo API error: ${text}`);
  }

  return await response.json();
}

/**
 * Fetches Gallo Programs for a given start date.
 *
 * @param {{ env: "prod" | "dev", startDate: string }} req.data
 * @returns {Promise<unknown>} Programs array
 */
export const galloFetchPrograms = onCall<
  { env: "prod" | "dev"; startDate: string },
  unknown
>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Not authenticated");

  const companyId = await getCompanyId(uid);
  const { env, startDate } = req.data;

  if (!env) throw new Error("Missing env");
  if (!startDate) throw new Error("Missing startDate");

  const gallo = await getGalloConfig(companyId);
  const apiKey = env === "prod" ? gallo.prodKey : gallo.devKey;
  if (!apiKey) throw new Error("No API key configured");

  const baseUrl = getBaseUrl(env);
  const orgCode = gallo.orgCode;

  const url = `${baseUrl}/${orgCode}/programs?startDate=${startDate}`;
  return await galloFetch(url, apiKey);
});

/**
 * Fetches Gallo Goals for a selected program & market.
 *
 * @param {{ env: "prod" | "dev", programId: string, marketId: string }} req.data
 * @returns {Promise<unknown>} Goals array
 */
export const galloFetchGoals = onCall<
  { env: "prod" | "dev"; programId: string; marketId: string },
  unknown
>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Not authenticated");

  const companyId = await getCompanyId(uid);
  const { env, programId, marketId } = req.data;

  if (!programId || !marketId) {
    throw new Error("Missing programId or marketId");
  }

  const gallo = await getGalloConfig(companyId);
  const apiKey = env === "prod" ? gallo.prodKey : gallo.devKey;
  if (!apiKey) throw new Error("No API key configured");

  const baseUrl = getBaseUrl(env);
  const orgCode = gallo.orgCode;

  const url = `${baseUrl}/${orgCode}/goals?programId=${programId}&marketId=${marketId}`;
  return await galloFetch(url, apiKey);
});

/**
 * Fetches Gallo Accounts for a specific goal & market.
 *
 * @param {{ env: "prod" | "dev", marketId: string, goalId: string }} req.data
 * @returns {Promise<unknown>} Accounts array
 */
export const galloFetchAccounts = onCall<
  { env: "prod" | "dev"; marketId: string; goalId: string },
  unknown
>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Not authenticated");

  const companyId = await getCompanyId(uid);
  const { env, marketId, goalId } = req.data;

  if (!marketId || !goalId) throw new Error("Missing marketId or goalId");

  const gallo = await getGalloConfig(companyId);
  const apiKey = env === "prod" ? gallo.prodKey : gallo.devKey;
  if (!apiKey) throw new Error("No API key configured");

  const baseUrl = getBaseUrl(env);
  const orgCode = gallo.orgCode;

  const url = `${baseUrl}/${orgCode}/accounts?marketId=${marketId}&goalId=${goalId}`;
  return await galloFetch(url, apiKey);
});

export const galloSyncProgramsByChangeStamp = onSchedule(
  "every 6 hours",
  async () => {
    const companies = await admin
      .firestore()
      .collection("companies")
      .where("integrations.galloAxis.enabled", "==", true)
      .get();

    for (const company of companies.docs) {
      try {
        await syncGalloProgramsForCompany(company.id);
      } catch (err) {
        await admin
          .firestore()
          .doc(`companies/${company.id}/integrations/galloAxis`)
          .set(
            {
              lastProgramSyncStatus: "error",
              lastProgramSyncError: String(err),
              lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
      }
    }
  }
);

/**
 * Syncs Gallo programs for a company using the Gallo changestamp mechanism.
 * Always records success or error state for admin observability.
 */
/**
 * Syncs Gallo programs for a company using changestamp-based incremental updates.
 * Automatically bootstraps on first run.
 */
export async function syncGalloProgramsForCompany(
  companyId: string
): Promise<{ newPrograms: number; bootstrap: boolean }> {
  const db = admin.firestore();

  const integrationRef = db.doc(
    `companies/${companyId}/integrations/galloAxis`
  );

  const integrationSnap = await integrationRef.get();
  const integration = integrationSnap.data();

  if (!integration?.env) {
    throw new Error("Gallo integration not configured");
  }

  const {
    env,
    lastProgramChangeStamp = 0,
    programStartDate,
    notifyOnProgramSync,
    notificationEmails = [],
  } = integration;

  const isBootstrap = lastProgramChangeStamp === 0;

  try {
    const gallo = await getGalloConfig(companyId);
    const apiKey = env === "prod" ? gallo.prodKey : gallo.devKey;
    if (!apiKey) throw new Error("Missing Gallo API key");

    if (isBootstrap && !programStartDate) {
      throw new Error("Missing programStartDate for initial Gallo sync");
    }

    const url = isBootstrap
      ? `${getBaseUrl(env)}/${gallo.orgCode}/programs?startDate=${programStartDate}`
      : `${getBaseUrl(env)}/${gallo.orgCode}/programs?changestamp=${lastProgramChangeStamp}`;

    const programs = await galloFetch(url, apiKey);

    if (!Array.isArray(programs) || programs.length === 0) {
      await integrationRef.set(
        {
          lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          lastProgramSyncStatus: "success",
        },
        { merge: true }
      );
      return { newPrograms: 0, bootstrap: isBootstrap };
    }

    // 🔹 Load existing programs ONCE
    const existingSnap = await db
      .collection(`companies/${companyId}/galloPrograms`)
      .select(admin.firestore.FieldPath.documentId())
      .get();

    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    let maxChangeStamp = lastProgramChangeStamp;
    let newPrograms = 0;

    const batch = db.batch();

    for (const p of programs) {
      if (!p.programId || !p.changestamp) continue;

      maxChangeStamp = Math.max(maxChangeStamp, p.changestamp);

      if (!existingIds.has(p.programId)) {
        newPrograms++;
      }

      const programRef = db.doc(
        `companies/${companyId}/galloPrograms/${p.programId}`
      );

      batch.set(
        programRef,
        {
          ...p,
          status:
            p.endDate && new Date(p.endDate).getTime() < Date.now()
              ? "expired"
              : "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          changestamp: p.changestamp,
        },
        { merge: true }
      );
    }

    batch.update(integrationRef, {
      lastProgramChangeStamp: maxChangeStamp,
      lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      lastProgramSyncStatus: "success",
    });

    await batch.commit();

    // 📧 Send ONE summary email (optional)
    if (notifyOnProgramSync && newPrograms > 0 && notificationEmails.length) {
      await writeProgramNotificationMail({
        companyId,
        newPrograms,
        env,
        emails: notificationEmails,
      });
    }

    return { newPrograms, bootstrap: isBootstrap };
  } catch (err: any) {
    await integrationRef.set(
      {
        lastProgramSyncStatus: "error",
        lastProgramSyncError: err.message ?? String(err),
        lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    throw err;
  }
}

/**
 * Manually triggers a Gallo program sync for the authenticated user's company.
 * Intended for admin validation and troubleshooting.
 */
export const runGalloScheduledImportNow = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Not authenticated");

  // TODO: role check (super-admin)
  const companyId = await getCompanyId(uid);

  return await syncGalloProgramsForCompany(companyId);
});

/**
 * Returns the current Gallo program sync status for the authenticated user's company.
 */
export const getGalloScheduledImportStatus = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Not authenticated");

  const companyId = await getCompanyId(uid);

  const snap = await admin
    .firestore()
    .doc(`companies/${companyId}/integrations/galloAxis`)
    .get();

  const data = snap.data();
  if (!data) return null;

  return {
    env: data.env,
    lastRunAt: data.lastProgramSyncAt?.seconds,
    lastRunStatus: data.lastProgramSyncStatus ?? "unknown",
    lastError: data.lastProgramSyncError ?? null,

    // Optional but nice UX
    nextRunAt: null, // you can calculate later
  };
});

async function writeProgramNotificationMail({
  companyId,
  newPrograms,
  env,
  emails,
}: {
  companyId: string;
  newPrograms: number;
  env: "prod" | "dev";
  emails: string[];
}) {
  const subject = `Gallo Axis: ${newPrograms} new program${
    newPrograms === 1 ? "" : "s"
  } available`;

  const text = `
${newPrograms} new Gallo program${newPrograms === 1 ? "" : "s"} ${
    newPrograms === 1 ? "is" : "are"
  } available for review.

Environment: ${env.toUpperCase()}

Log into Displaygram to review and import programs.
`;

  await admin.firestore().collection("mail").add({
    to: emails,
    message: {
      subject,
      text,
    },
  });
}
