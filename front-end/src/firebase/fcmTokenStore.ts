import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";

export async function saveFcmToken(uid: string, token: string) {
  if (!uid || !token) return;

  const tokenRef = doc(db, `users/${uid}/fcmTokens/${token}`);

  await setDoc(tokenRef, {
    token,
    createdAt: serverTimestamp(),
    device: navigator.userAgent,
  }).catch((err) => {
    console.error("Error saving FCM token:", err);
  });
}

export async function deleteFcmToken(uid: string, token: string) {
  if (!uid || !token) return;

  const tokenRef = doc(db, `users/${uid}/fcmTokens/${token}`);

  await deleteDoc(tokenRef).catch((err) => {
    console.error("Error deleting FCM token:", err);
  });
}

export async function hasExistingFcmToken(uid: string): Promise<boolean> {
  if (!uid) return false;

  try {
    const colRef = collection(db, `users/${uid}/fcmTokens`);
    const snap = await getDocs(colRef);
    return snap.size > 0;
  } catch (err) {
    console.error("hasExistingFcmToken error:", err);
    return false;
  }
}

export async function hasTokenForThisDevice(uid: string): Promise<boolean> {
  if (!uid) return false;

  try {
    const ua = navigator.userAgent;
    const colRef = collection(db, `users/${uid}/fcmTokens`);
    const snap = await getDocs(colRef);

    return snap.docs.some((tokenDoc) => tokenDoc.data().device === ua);
  } catch (err) {
    console.error("hasTokenForThisDevice error:", err);
    return false;
  }
}
