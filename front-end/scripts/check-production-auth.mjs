import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const frontEndRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const fileEnvironment = loadEnv("production", frontEndRoot, "");
const environment = { ...fileEnvironment, ...process.env };

const requiredValue = (name) => {
  const value = environment[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is required. Configure front-end/.env.production.local before deploying.`,
    );
  }
  return value;
};

const displaygramEnvironment =
  environment.VITE_DISPLAYGRAM_ENV?.trim() || "production";
if (displaygramEnvironment !== "production") {
  throw new Error(
    `Production auth preflight cannot run with VITE_DISPLAYGRAM_ENV=${displaygramEnvironment}.`,
  );
}

const projectId = environment.VITE_FIREBASE_PROJECT_ID?.trim() || "retail-sight";
if (projectId !== "retail-sight") {
  throw new Error(
    `Production auth preflight expected project retail-sight, received ${projectId}.`,
  );
}

const apiKey = requiredValue("VITE_FIREBASE_API_KEY");
const continueUri =
  environment.DISPLAYGRAM_AUTH_CONTINUE_URI?.trim() ||
  "https://displaygram.com/login";

const response = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${encodeURIComponent(apiKey)}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      providerId: "google.com",
      continueUri,
      customParameter: { prompt: "select_account" },
    }),
    signal: AbortSignal.timeout(15_000),
  },
);

const payload = await response.json();
if (!response.ok) {
  const reason = payload?.error?.message || `HTTP ${response.status}`;
  throw new Error(`Production Google auth preflight failed: ${reason}`);
}

if (payload.providerId !== "google.com" || !payload.authUri) {
  throw new Error("Production Google auth preflight returned an invalid response.");
}

const authUri = new URL(payload.authUri);
if (authUri.hostname !== "accounts.google.com") {
  throw new Error(
    `Production Google auth preflight returned unexpected host ${authUri.hostname}.`,
  );
}

const oauthClientId = authUri.searchParams.get("client_id");
if (!oauthClientId?.startsWith("484872165965-")) {
  throw new Error(
    "Production Google auth preflight returned an OAuth client from the wrong Firebase project.",
  );
}

console.log(
  "Production Google auth preflight passed for retail-sight and displaygram.com.",
);
