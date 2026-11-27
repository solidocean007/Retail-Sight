import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";

export type FcmTokenPlatform = "web" | "android-native";

export async function saveFcmToken(
  uid: string,
  token: string,
  platform: FcmTokenPlatform = "web",
) {
  if (!uid || !token) return;

  const tokenRef = doc(db, `users/${uid}/fcmTokens/${token}`);

  // Token documents are intentionally create-only in Firestore rules. Avoid
  // turning a normal re-registration into a denied update.
  const existingToken = await getDoc(tokenRef);
  if (existingToken.exists()) return;

  try {
    await setDoc(tokenRef, {
      token,
      createdAt: serverTimestamp(),
      device: navigator.userAgent,
      platform,
    });
  } catch (err) {
    // Two registration paths can race on startup. If the other one created the
    // token first, the create-only rule rejects this setDoc as an update even
    // though the device is correctly registered.
    const tokenAfterFailure = await getDoc(tokenRef).catch(() => null);
    if (tokenAfterFailure?.exists()) return;

    console.error("Error saving FCM token:", err);
    throw err;
  }
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

export async function hasTokenForThisDevice(
  uid: string,
  platform: FcmTokenPlatform = "web",
): Promise<boolean> {
  if (!uid) return false;

  try {
    const ua = navigator.userAgent;
    const colRef = collection(db, `users/${uid}/fcmTokens`);
    const snap = await getDocs(colRef);

    return snap.docs.some((tokenDoc) => {
      const data = tokenDoc.data();
      const storedPlatform = data.platform || "web";
      return data.device === ua && storedPlatform === platform;
    });
  } catch (err) {
    console.error("hasTokenForThisDevice error:", err);
    return false;
  }
}
