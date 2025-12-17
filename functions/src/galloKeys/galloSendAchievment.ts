import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

/**
 * Fetches the Gallo API configuration for a company.
 *
 * @param companyId Firestore company ID
 * @returns Gallo configuration object
 * @throws If no Gallo config exists
 */
async function getGalloConfig(companyId: string) {
  const snap = await admin.firestore().doc(`apiKeys/${companyId}`).get();
  const gallo = snap.data()?.gallo;
  if (!gallo) throw new Error("No gallo config exists");
  return gallo;
}

export const galloSendAchievement = onCall<
  {
    env: "prod" | "dev";
    oppId: string;
    closedBy: string;
    closedDate: string;
    closedUnits: string | number;
    photos: { file: string }[];
  },
  unknown
>(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new Error("Not authenticated");

  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const companyId = userSnap.data()?.companyId;
  if (!companyId) throw new Error("Missing companyId");

  const gallo = await getGalloConfig(companyId);

  const { env, oppId, closedBy, closedDate, closedUnits, photos } = req.data;

  const apiKey = env === "prod" ? gallo.prodKey : gallo.devKey;
  const baseUrl = env === "prod" ? gallo.prodBaseUrl : gallo.devBaseUrl;
  const orgCode = gallo.orgCode;

  if (!apiKey) throw new Error("Missing API key for Gallo");
  if (!baseUrl) throw new Error("Missing baseUrl for Gallo");
  if (!orgCode) throw new Error("Missing orgCode");

  const url = `${baseUrl}/${orgCode}/achievements`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      oppId,
      closedBy,
      closedDate,
      closedUnits,
      photos,
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("Gallo error:", text);
    throw new Error(`Gallo error: ${text}`);
  }

  return { ok: true };
});
