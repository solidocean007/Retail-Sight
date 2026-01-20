// functions/src/gallo.ts
import {
  CallableRequest,
  HttpsError,
  onCall,
} from "firebase-functions/v2/https";
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
 * - Requires startDate
 * - Updates lastProgramChangeStamp ONLY on success
 * - Bootstraps changestamp ONLY if currently missing / zero
 */
export const galloFetchPrograms = onCall(
  async (
    req: CallableRequest<{
      env: "prod" | "dev";
      startDate: number;
    }>
  ) => {
    const uid = req.auth?.uid;
    if (!uid) throw new Error("Not authenticated");

    const companyId = await getCompanyId(uid);
    const { env, startDate } = req.data;

    if (!Number.isInteger(startDate)) {
      throw new HttpsError(
        "invalid-argument",
        "startDate must be a UNIX timestamp in seconds"
      );
    }

    if (!env) throw new Error("Missing env");
    if (!startDate) throw new Error("Missing startDate");

    const gallo = await getGalloConfig(companyId);

    // 🔍 Log ONCE at entry
    console.log("[galloFetchPrograms] gallo config", {
      orgCode: gallo.orgCode,
      hasProdKey: !!gallo.prodKey,
      hasDevKey: !!gallo.devKey,
    });

    const apiKey = env === "prod" ? gallo.prodKey : gallo.devKey;
    if (!apiKey) throw new Error("No API key configured");

    const db = admin.firestore();
    const integrationRef = db.doc(
      `companies/${companyId}/integrations/galloAxis`
    );

    const baseUrl = getBaseUrl(env);
    const url = `${baseUrl}/${gallo.orgCode}/programs?startDate=${startDate}`;

    let programs: any[];

    console.log("[galloFetchPrograms] request", {
      env,
      url,
      startDate,
      apiKey,
    });

    // -------------------------------
    // Fetch (guarded)
    // -------------------------------
    try {
      programs = await galloFetch(url, apiKey);
      console.log("[galloFetchPrograms] raw programs response", {
        isArray: Array.isArray(programs),
        length: Array.isArray(programs) ? programs.length : null,
        sample: Array.isArray(programs) ? programs.slice(0, 2) : programs,
      });
    } catch (err) {
      console.error("[galloFetchPrograms] fetch failed", err);

      // ❗ DO NOT TOUCH CHANGE STAMP
      await integrationRef.set(
        {
          lastProgramSyncStatus: "error",
          lastProgramSyncError:
            err instanceof Error ? err.message : String(err),
          lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      throw new HttpsError(
        "internal",
        err instanceof Error ? err.message : String(err)
      );
    }

    if (!Array.isArray(programs)) {
      return { imported: 0 };
    }

    // -------------------------------
    // Load existing programs
    // -------------------------------
    const existingSnap = await db
      .collection(`companies/${companyId}/galloPrograms`)
      .select(admin.firestore.FieldPath.documentId())
      .get();

    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    let newPrograms = 0;

    const batch = db.batch();

    for (const p of programs) {
      if (!p.programId) continue;

      if (!existingIds.has(p.programId)) newPrograms++;

      const ref = db.doc(`companies/${companyId}/galloPrograms/${p.programId}`);

      batch.set(
        ref,
        {
          ...p,
          status:
            p.endDate && new Date(p.endDate).getTime() < Date.now()
              ? "expired"
              : "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    // -------------------------------
    // ✅ Commit programs FIRST
    // -------------------------------
    await batch.commit();

    // -------------------------------
    // 🔑 Update integration metadata (SUCCESS ONLY)
    // -------------------------------
    const integrationSnap = await integrationRef.get();
    const existingStamp = integrationSnap.data()?.lastProgramChangeStamp ?? 0;

    const { notifyOnProgramSync, notificationEmails = [] } =
      integrationSnap.data() || {};

    if (notifyOnProgramSync && newPrograms > 0 && notificationEmails.length) {
      await writeProgramNotificationMail({
        newPrograms,
        env,
        emails: notificationEmails,
      });
    }

    await integrationRef.set(
      {
        ...(existingStamp === 0
          ? { lastProgramChangeStamp: startDate } // ✅ BOOTSTRAP
          : {}),
        lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        lastProgramSyncStatus: "manual",
        lastProgramSyncError: null,
      },
      { merge: true }
    );

    return {
      imported: newPrograms,
      programCount: programs.length,
      startDate,
    };
  }
);

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
    const db = admin.firestore();

    const companies = await db.collection("companies").get();

    for (const company of companies.docs) {
      const integrationRef = db.doc(
        `companies/${company.id}/integrations/galloAxis`
      );

      try {
        const snap = await integrationRef.get();

        if (!snap.exists) continue;

        const integration = snap.data();
        if (!integration?.env) continue;

        await syncGalloProgramsForCompany(company.id);
      } catch (err) {
        console.error(
          "[galloSyncProgramsByChangeStamp] error for company",
          company.id,
          err
        );

        await integrationRef.set(
          {
            lastProgramSyncStatus: "error",
            lastProgramSyncError:
              err instanceof Error ? err.message : String(err),
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
    notifyOnProgramSync,
    notificationEmails = [],
    orgCode,
  } = integration;

  try {
    const gallo = await getGalloConfig(companyId);
    const apiKey = env === "prod" ? gallo.prodKey : gallo.devKey;
    if (!apiKey) throw new Error("Missing Gallo API key");

    /**
     * 🟡 FIRST RUN: initialize changestamp only
     */
    if (!lastProgramChangeStamp || typeof lastProgramChangeStamp !== "number") {
      await integrationRef.set(
        {
          lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          lastProgramSyncStatus: "needs-bootstrap",
        },
        { merge: true }
      );

      return { newPrograms: 0, bootstrap: true };
    }

    /**
     * 🟢 INCREMENTAL SYNC
     */
    const url = `${getBaseUrl(env)}/${orgCode}/programs?changestamp=${lastProgramChangeStamp}`;

    const programs = await galloFetch(url, apiKey);

    if (!Array.isArray(programs) || programs.length === 0) {
      await integrationRef.set(
        {
          lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          lastProgramSyncStatus: "success",
        },
        { merge: true }
      );

      return { newPrograms: 0, bootstrap: false };
    }

    const existingSnap = await db
      .collection(`companies/${companyId}/galloPrograms`)
      .select(admin.firestore.FieldPath.documentId())
      .get();

    const existingIds = new Set(existingSnap.docs.map((d) => d.id));

    let newPrograms = 0;

    const batch = db.batch();

    for (const p of programs) {
      if (!p.programId) continue;

      if (!existingIds.has(p.programId)) newPrograms++;

      const ref = db.doc(`companies/${companyId}/galloPrograms/${p.programId}`);

      batch.set(
        ref,
        {
          ...p,
          status:
            p.endDate && new Date(p.endDate).getTime() < Date.now()
              ? "expired"
              : "active",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const nextCursor = Math.floor(Date.now() / 1000);

    batch.update(integrationRef, {
      lastProgramChangeStamp: nextCursor,
      lastProgramSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      lastProgramSyncStatus: "success",
    });

    await batch.commit();

    if (notifyOnProgramSync && newPrograms > 0 && notificationEmails.length) {
      await writeProgramNotificationMail({
        newPrograms,
        env,
        emails: notificationEmails,
      });
    }

    return { newPrograms, bootstrap: false };
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

  const lastRunSeconds = data.lastProgramSyncAt?.seconds ?? null;

  // ⏱ every 6 hours
  const SIX_HOURS = 6 * 60 * 60;
  const nextRunAt = lastRunSeconds
    ? lastRunSeconds + SIX_HOURS
    : Math.floor(Date.now() / 1000) + SIX_HOURS;

  return {
    env: data.env,
    lastRunAt: data.lastProgramSyncAt?.seconds,
    lastRunStatus: data.lastProgramSyncStatus ?? "unknown",
    lastError: data.lastProgramSyncError ?? null,

    // Optional but nice UX
    nextRunAt, // you can calculate later
  };
});

/**
 * Writes a summary notification email to Firestore for delivery via the
 * Firebase "mail" collection integration.
 *
 * This is used after a successful Gallo program sync when new programs
 * are detected. A single summary email is sent per sync run.
 *
 * @param {Object} params
 * @param {number} params.newPrograms - The number of newly discovered Gallo programs.
 * @param {"prod" | "dev"} params.env - The Gallo environment the sync ran against.
 * @param {string[]} params.emails - List of recipient email addresses.
 *
 * @returns {Promise<void>} Resolves once the mail document is written.
 */
async function writeProgramNotificationMail({
  newPrograms,
  env,
  emails,
}: {
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
  } available for review.  Goals from these programs can now be imported into Displaygram.  Goals are not automatically
  imported.  Please log into Displaygram to review and import the goals you wish to activate.

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
