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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");

setPersistence(auth, browserLocalPersistence);

export { updateProfile };
