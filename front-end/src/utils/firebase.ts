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

const firebaseConfig = {
  apiKey: "AIzaSyDnyLMk-Ng1SoFCKe69rJK_96nURAmNLzE",
  authDomain: "retail-sight.firebaseapp.com",
  projectId: "retail-sight",
  storageBucket: "retail-sight.appspot.com",
  messagingSenderId: "484872165965",
  appId: "1:484872165965:web:feb232cfe100a4b9105a04",
  measurementId: "G-XSXPNG7BCB",
};

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
