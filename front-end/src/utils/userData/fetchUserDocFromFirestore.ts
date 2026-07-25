// fetchUserDocFromFirestore
import { doc, getDoc, collection, DocumentData } from "firebase/firestore";
import { db, auth } from "../firebase";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Reject instead of hanging forever — getDoc has no built-in timeout. */
const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);

export type FetchUserDocResult = {
  data: DocumentData | null;
  /** Non-null means the read FAILED (vs. data:null meaning "no such user"). */
  error: unknown | null;
};

/**
 * Reads /users/{uid}, distinguishing a genuinely missing doc from a failed read.
 *
 * Why this is defensive:
 * `onAuthStateChanged` can fire before the ID token has fully propagated —
 * especially on a cold start of a freshly installed iOS PWA. Firestore rules
 * require `request.auth.uid == userId`, so a read in that window fails with
 * permission-denied. The old version swallowed that error and returned null,
 * which produced a partial user object with no companyId and left the app
 * stuck forever on "Loading your company profile...".
 */
export const fetchUserDocWithRetry = async (
  uid: string,
  attempts = 4,
): Promise<FetchUserDocResult> => {
  let lastError: unknown = null;

  for (let i = 0; i < attempts; i++) {
    try {
      // Force the ID token to be minted/refreshed before reading.
      if (auth.currentUser) {
        await withTimeout(auth.currentUser.getIdToken(), 10000);
      }

      const userRef = doc(collection(db, "users"), uid);
      const userSnap = await withTimeout(getDoc(userRef), 15000);

      if (userSnap.exists()) {
        return { data: userSnap.data(), error: null };
      }

      // Genuinely absent — not transient, so don't burn retries on it.
      console.error("No such user!", uid);
      return { data: null, error: null };
    } catch (error) {
      lastError = error;
      console.warn(
        `fetchUserDoc attempt ${i + 1}/${attempts} failed:`,
        error,
      );

      // 400ms, 800ms, 1600ms
      if (i < attempts - 1) await sleep(400 * 2 ** i);
    }
  }

  console.error("Error fetching user document (all retries failed):", lastError);
  return { data: null, error: lastError };
};

/** Back-compat wrapper: returns the doc data or null. */
export const fetchUserDocFromFirestore = async (uid: string) => {
  const { data } = await fetchUserDocWithRetry(uid);
  return data;
};
