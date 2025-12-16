// functions/src/gallo.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

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
