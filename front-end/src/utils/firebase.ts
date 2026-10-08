// front-end/src/utils/firebase.ts
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const configuredValue = (value: string | undefined, fallback: string) =>
  value?.trim() || fallback;

export const displaygramEnvironment = configuredValue(
  import.meta.env.VITE_DISPLAYGRAM_ENV,
  "production",
);

const requiredFirebaseValue = (
  value: string | undefined,
  productionFallback: string,
  variableName: string,
) => {
  const configured = value?.trim();
  if (configured) return configured;
  if (displaygramEnvironment === "production") return productionFallback;
  throw new Error(
    `${variableName} is required for the ${displaygramEnvironment} environment.`,
  );
};

const firebaseConfig = {
  apiKey: requiredFirebaseValue(
    import.meta.env.VITE_FIREBASE_API_KEY,
    "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
    "VITE_FIREBASE_API_KEY",
  ),
  authDomain: requiredFirebaseValue(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    "retail-sight.firebaseapp.com",
    "VITE_FIREBASE_AUTH_DOMAIN",
  ),
  projectId: requiredFirebaseValue(
    import.meta.env.VITE_FIREBASE_PROJECT_ID,
    "retail-sight",
    "VITE_FIREBASE_PROJECT_ID",
  ),
  storageBucket: requiredFirebaseValue(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    "retail-sight.appspot.com",
    "VITE_FIREBASE_STORAGE_BUCKET",
  ),
  messagingSenderId: requiredFirebaseValue(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    "484872165965",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
  ),
  appId: requiredFirebaseValue(
    import.meta.env.VITE_FIREBASE_APP_ID,
    "1:484872165965:web:feb232cfe100a4b9105a04",
    "VITE_FIREBASE_APP_ID",
  ),
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.trim() ||
    (displaygramEnvironment === "production" ? "G-XSXPNG7BCB" : undefined),
};

if (
  displaygramEnvironment !== "production" &&
  firebaseConfig.projectId === "retail-sight"
) {
  throw new Error(
    "A non-production Displaygram build cannot use the production Firebase project.",
  );
}

export const app = initializeApp(firebaseConfig);

const appCheckSiteKey =
  import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY?.trim();

if (appCheckSiteKey) {
  const debugToken =
    import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim();
  if (import.meta.env.DEV && debugToken) {
    (
      globalThis as typeof globalThis & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: string;
      }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");

setPersistence(auth, browserLocalPersistence);

export { updateProfile };
